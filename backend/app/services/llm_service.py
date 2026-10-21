from __future__ import annotations

import json
import time
from typing import Any

import httpx

from app.core.config import settings


class LLMProviderError(RuntimeError):
    """Safe, provider-independent LLM error."""


GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"


def generate_json(
    *,
    system_prompt: str,
    user_prompt: str,
) -> dict[str, Any]:
    if settings.groq_api_key is None:
        raise LLMProviderError("Groq API key is not configured.")

    payload = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "max_completion_tokens": settings.llm_max_output_tokens,
        "reasoning_effort": "low",
        "temperature": 0.1,
    }

    api_key = settings.groq_api_key.get_secret_value()
    last_error = "Groq request failed."

    for attempt in range(settings.llm_max_retries + 1):
        try:
            response = httpx.post(
                GROQ_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=settings.llm_timeout_seconds,
            )

            if response.status_code == 429 or response.status_code >= 500:
                last_error = (
                    f"Groq temporarily unavailable "
                    f"(HTTP {response.status_code})."
                )

                if attempt < settings.llm_max_retries:
                    time.sleep(min(2 ** attempt, 4))
                    continue

                raise LLMProviderError(last_error)

            if not response.is_success:
                raise LLMProviderError(
                    f"Groq rejected the request "
                    f"(HTTP {response.status_code})."
                )

            try:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
            except (ValueError, KeyError, IndexError, TypeError) as exc:
                raise LLMProviderError(
                    "Groq returned an invalid response structure."
                ) from exc

            if not isinstance(content, str) or not content.strip():
                raise LLMProviderError("Groq returned an empty response.")

            try:
                parsed = json.loads(content)
            except json.JSONDecodeError as exc:
                raise LLMProviderError(
                    "Groq did not return valid JSON."
                ) from exc

            if not isinstance(parsed, dict):
                raise LLMProviderError(
                    "Groq JSON response must be an object."
                )

            return parsed

        except httpx.TimeoutException as exc:
            last_error = "Groq request timed out."

            if attempt >= settings.llm_max_retries:
                raise LLMProviderError(last_error) from exc

            time.sleep(min(2 ** attempt, 4))

        except httpx.TransportError as exc:
            last_error = "Groq network request failed."

            if attempt >= settings.llm_max_retries:
                raise LLMProviderError(last_error) from exc

            time.sleep(min(2 ** attempt, 4))

    raise LLMProviderError(last_error)