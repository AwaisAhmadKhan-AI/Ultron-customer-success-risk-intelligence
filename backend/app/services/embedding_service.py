from __future__ import annotations

import math
import time
from typing import Literal

import httpx

from app.core.config import settings


EmbeddingTask = Literal["retrieval.query", "retrieval.passage"]


class EmbeddingProviderError(RuntimeError):
    """Safe, provider-independent embedding error."""


JINA_EMBEDDINGS_URL = "https://api.jina.ai/v1/embeddings"


def embed_texts(
    texts: list[str],
    *,
    task: EmbeddingTask,
    batch_size: int = 32,
) -> list[list[float]]:
    if not texts:
        return []

    if batch_size < 1 or batch_size > 64:
        raise ValueError("batch_size must be between 1 and 64.")

    if any(not isinstance(item, str) or not item.strip() for item in texts):
        raise ValueError("Embedding inputs must be non-empty strings.")

    if settings.jina_api_key is None:
        raise EmbeddingProviderError("Jina API key is not configured.")

    api_key = settings.jina_api_key.get_secret_value()
    all_embeddings: list[list[float]] = []

    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]

        payload = {
            "model": settings.embedding_model,
            "input": batch,
            "task": task,
            "dimensions": settings.embedding_dimension,
            "embedding_type": "float",
            "normalized": True,
            "truncate": True,
        }

        response_data = None
        last_error = "Jina embeddings request failed."

        for attempt in range(settings.embedding_max_retries + 1):
            try:
                response = httpx.post(
                    JINA_EMBEDDINGS_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json=payload,
                    timeout=settings.embedding_timeout_seconds,
                )

                if response.status_code == 429 or response.status_code >= 500:
                    last_error = (
                        f"Jina embeddings temporarily unavailable "
                        f"(HTTP {response.status_code})."
                    )

                    if attempt < settings.embedding_max_retries:
                        time.sleep(min(2 ** attempt, 4))
                        continue

                    raise EmbeddingProviderError(last_error)

                if not response.is_success:
                    raise EmbeddingProviderError(
                        f"Jina embeddings rejected the request "
                        f"(HTTP {response.status_code})."
                    )

                try:
                    response_data = response.json()
                except ValueError as exc:
                    raise EmbeddingProviderError(
                        "Jina returned an invalid JSON response."
                    ) from exc

                break

            except httpx.TimeoutException as exc:
                last_error = "Jina embeddings request timed out."

                if attempt >= settings.embedding_max_retries:
                    raise EmbeddingProviderError(last_error) from exc

                time.sleep(min(2 ** attempt, 4))

            except httpx.TransportError as exc:
                last_error = "Jina embeddings network request failed."

                if attempt >= settings.embedding_max_retries:
                    raise EmbeddingProviderError(last_error) from exc

                time.sleep(min(2 ** attempt, 4))

        if response_data is None:
            raise EmbeddingProviderError(last_error)

        data = response_data.get("data")

        if not isinstance(data, list) or len(data) != len(batch):
            raise EmbeddingProviderError(
                "Jina returned an unexpected number of embeddings."
            )

        try:
            data = sorted(data, key=lambda item: item["index"])
            batch_embeddings = [
                [float(value) for value in item["embedding"]]
                for item in data
            ]
        except (KeyError, TypeError, ValueError) as exc:
            raise EmbeddingProviderError(
                "Jina returned an invalid embedding structure."
            ) from exc

        for vector in batch_embeddings:
            if len(vector) != settings.embedding_dimension:
                raise EmbeddingProviderError(
                    "Jina returned an unexpected embedding dimension."
                )

            if not all(math.isfinite(value) for value in vector):
                raise EmbeddingProviderError(
                    "Jina returned a non-finite embedding value."
                )

        all_embeddings.extend(batch_embeddings)

    return all_embeddings