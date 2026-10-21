from sqlalchemy import and_, select

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.enums import DocumentIngestionStatus
from app.services.embedding_service import embed_texts


BATCH_SIZE = 32


def main() -> None:
    processed = 0

    with SessionLocal() as db:
        while True:
            statement = (
                select(DocumentChunk)
                .join(
                    Document,
                    and_(
                        Document.id == DocumentChunk.document_id,
                        Document.account_id == DocumentChunk.account_id,
                    ),
                )
                .where(
                    DocumentChunk.embedding.is_(None),
                    Document.archived_at.is_(None),
                    Document.ingestion_status == DocumentIngestionStatus.READY,
                )
                .order_by(
                    DocumentChunk.document_id,
                    DocumentChunk.chunk_index,
                )
                .limit(BATCH_SIZE)
            )

            chunks = list(db.scalars(statement).all())

            if not chunks:
                break

            vectors = embed_texts(
                [chunk.chunk_text for chunk in chunks],
                task="retrieval.passage",
                batch_size=BATCH_SIZE,
            )

            try:
                for chunk, vector in zip(chunks, vectors, strict=True):
                    chunk.embedding = vector

                db.commit()
                processed += len(chunks)
                print(f"Embedded chunks in this run: {processed}")

            except Exception:
                db.rollback()
                raise

    print(f"Backfill complete. Total chunks embedded: {processed}")


if __name__ == "__main__":
    main()