from __future__ import annotations

from hashlib import sha256
from io import BytesIO
from pathlib import Path
from uuid import uuid4
import re
from app.services.embedding_service import embed_texts
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pypdf import PdfReader
from sqlalchemy import func, select
from app.models.account import Account
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.enums import DocumentIngestionStatus
from app.models.user import User


MAX_UPLOAD_BYTES = 10 * 1024 * 1024
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 150

# Private storage: is directory ko static/public files ke taur par serve mat karna.
STORAGE_ROOT = (
    Path(__file__).resolve().parents[2]
    / "private_uploads"
    / "documents"
)


def validate_and_extract(
    filename: str,
    content: bytes,
) -> tuple[str, str, str]:
    safe_name = (filename or "").replace("\\", "/").split("/")[-1].strip()

    if not safe_name or "\x00" in safe_name:
        raise HTTPException(422, "Invalid filename.")

    suffix = Path(safe_name).suffix.lower()

    if suffix not in {".pdf", ".txt", ".md"}:
        raise HTTPException(
            415,
            "Only PDF, TXT and Markdown files are supported.",
        )

    if not content:
        raise HTTPException(422, "The uploaded file is empty.")

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Maximum upload size is 10 MB.")

    if suffix == ".pdf":
        if not content.startswith(b"%PDF-"):
            raise HTTPException(415, "File is not a valid PDF.")

        try:
            reader = PdfReader(BytesIO(content), strict=True)
            text = "\n".join(
                page.extract_text() or ""
                for page in reader.pages
            )
        except Exception as exc:
            raise HTTPException(
                422,
                "PDF text extraction failed.",
            ) from exc

        mime_type = "application/pdf"

    else:
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                422,
                "TXT and Markdown files must contain valid UTF-8 text.",
            ) from exc

        mime_type = (
            "text/markdown"
            if suffix == ".md"
            else "text/plain"
        )

    text = text.replace("\x00", "").strip()

    if not text:
        raise HTTPException(
            422,
            "No extractable text was found in the document.",
        )

    return safe_name, mime_type, text


def split_into_chunks(text: str) -> list[str]:
    text = re.sub(r"\r\n?", "\n", text).strip()
    chunks: list[str] = []
    start = 0

    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))

        if end < len(text):
            boundary_start = start + int(CHUNK_SIZE * 0.6)
            newline = text.rfind("\n", boundary_start, end)
            space = text.rfind(" ", boundary_start, end)
            boundary = max(newline, space)

            if boundary > boundary_start:
                end = boundary

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = max(start + 1, end - CHUNK_OVERLAP)

    return chunks


def upload_and_ingest_document(
    db: Session,
    account: Account,
    user: User,
    filename: str,
    requested_title: str | None,
    content: bytes,
) -> Document:
    safe_name, mime_type, extracted_text = validate_and_extract(
        filename,
        content,
    )

    title = (requested_title or Path(safe_name).stem).strip()

    if not title or len(title) > 200:
        raise HTTPException(
            422,
            "Document title must contain 1–200 characters.",
        )

    content_hash = sha256(content).hexdigest()

    existing = db.scalar(
        select(Document.id).where(
            Document.account_id == account.id,
            Document.content_sha256 == content_hash,
        )
    )

    if existing is not None:
        raise HTTPException(
            409,
            "This document content already exists for this account.",
        )

    document_id = uuid4()
    storage_key = (
        f"{account.id}/{document_id}"
        f"{Path(safe_name).suffix.lower()}"
    )
    storage_path = STORAGE_ROOT / storage_key

    try:
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        storage_path.write_bytes(content)
    except OSError as exc:
        raise HTTPException(
            500,
            "Document could not be stored.",
        ) from exc

    document = Document(
        id=document_id,
        account_id=account.id,
        uploaded_by_user_id=user.id,
        title=title,
        original_filename=safe_name,
        mime_type=mime_type,
        size_bytes=len(content),
        content_sha256=content_hash,
        storage_key=storage_key,
        ingestion_status=DocumentIngestionStatus.UPLOADED,
    )

    # Save the document record first.
    try:
        db.add(document)
        db.commit()
        db.refresh(document)

    except IntegrityError as exc:
        db.rollback()
        storage_path.unlink(missing_ok=True)

        raise HTTPException(
            409,
            "The document conflicts with an existing record.",
        ) from exc

    except Exception as exc:
        db.rollback()
        storage_path.unlink(missing_ok=True)

        raise HTTPException(
            500,
            "Document record could not be saved.",
        ) from exc

    # Extracted text -> chunks -> embeddings -> database.
    try:
        document.ingestion_status = (
            DocumentIngestionStatus.PROCESSING
        )
        db.commit()

        chunks = split_into_chunks(extracted_text)

        vectors = embed_texts(
            chunks,
            task="retrieval.passage",
            batch_size=32,
        )

        for index, (chunk_text, vector) in enumerate(
            zip(chunks, vectors, strict=True)
        ):
            db.add(
                DocumentChunk(
                    account_id=account.id,
                    document_id=document.id,
                    chunk_index=index,
                    chunk_text=chunk_text,
                    chunk_metadata={
                        "source_format": (
                            Path(safe_name).suffix.lower()
                        ),
                    },
                    embedding=vector,
                )
            )

        document.ingestion_status = DocumentIngestionStatus.READY
        document.ingestion_error_code = None

        db.commit()
        db.refresh(document)

        return document

    except Exception as exc:
        db.rollback()

        failed_document = db.get(Document, document_id)

        if failed_document is not None:
            failed_document.ingestion_status = (
                DocumentIngestionStatus.FAILED
            )
            failed_document.ingestion_error_code = "ingestion_failed"

            try:
                db.commit()
            except Exception:
                db.rollback()

        raise HTTPException(
            500,
            "Document ingestion failed. "
            "The failure was recorded if possible.",
        ) from exc


def list_account_documents(
    db: Session,
    account_id,
    include_archived: bool = False,
) -> tuple[list[Document], int]:
    statement = select(Document).where(
        Document.account_id == account_id,
    )

    count_statement = select(func.count(Document.id)).where(
        Document.account_id == account_id,
    )

    if not include_archived:
        statement = statement.where(
            Document.archived_at.is_(None)
        )
        count_statement = count_statement.where(
            Document.archived_at.is_(None)
        )

    total = db.scalar(count_statement) or 0

    items = list(
        db.scalars(
            statement.order_by(Document.created_at.desc())
        ).all()
    )

    return items, total