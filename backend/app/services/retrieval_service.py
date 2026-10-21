from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.enums import DocumentIngestionStatus
from app.services.embedding_service import embed_texts


@dataclass(frozen=True)
class RetrievedDocumentChunk:
    chunk_id: UUID
    document_id: UUID
    title: str
    original_filename: str
    created_at: datetime
    excerpt: str
    cosine_distance: float


def retrieve_document_chunks(
    db: Session,
    *,
    account_id: UUID,
    query: str,
    limit: int = 6,
) -> list[RetrievedDocumentChunk]:
    query = query.strip()

    if not query:
        raise ValueError("Retrieval query must not be empty.")

    if len(query) > 4000:
        raise ValueError("Retrieval query is too long.")

    if not 1 <= limit <= 20:
        raise ValueError("Retrieval limit must be between 1 and 20.")

    # Avoid calling the embedding provider when this account has
    # no indexed document chunks.
    has_embeddings = db.scalar(
        select(DocumentChunk.id)
        .join(
            Document,
            and_(
                Document.id == DocumentChunk.document_id,
                Document.account_id == DocumentChunk.account_id,
            ),
        )
        .where(
            DocumentChunk.account_id == account_id,
            DocumentChunk.embedding.is_not(None),
            Document.archived_at.is_(None),
            Document.ingestion_status == DocumentIngestionStatus.READY,
        )
        .limit(1)
    )

    if has_embeddings is None:
        return []

    query_vector = embed_texts(
        [query],
        task="retrieval.query",
    )[0]

    distance = DocumentChunk.embedding.cosine_distance(
        query_vector
    ).label("cosine_distance")

    statement = (
        select(DocumentChunk, Document, distance)
        .join(
            Document,
            and_(
                Document.id == DocumentChunk.document_id,
                Document.account_id == DocumentChunk.account_id,
            ),
        )
        .where(
            # Critical security boundary: don't remove these filters.
            DocumentChunk.account_id == account_id,
            Document.account_id == account_id,
            DocumentChunk.embedding.is_not(None),
            Document.archived_at.is_(None),
            Document.ingestion_status == DocumentIngestionStatus.READY,
        )
        .order_by(distance.asc())
        .limit(limit)
    )

    rows = db.execute(statement).all()

    return [
        RetrievedDocumentChunk(
            chunk_id=chunk.id,
            document_id=document.id,
            title=document.title,
            original_filename=document.original_filename,
            created_at=document.created_at,
            excerpt=chunk.chunk_text,
            cosine_distance=float(distance_value),
        )
        for chunk, document, distance_value in rows
    ]