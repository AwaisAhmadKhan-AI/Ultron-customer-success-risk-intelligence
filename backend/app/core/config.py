from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

class Settings(BaseSettings):
    app_name: str = "Ultron API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173"

    database_url: str
    alembic_database_url: str

    jwt_secret_key: SecretStr
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    groq_api_key: SecretStr | None = None
    jina_api_key: SecretStr | None = None

    llm_provider: str = "groq"
    llm_model: str = "openai/gpt-oss-120b"
    llm_timeout_seconds: int = 30
    llm_max_retries: int = 3
    llm_max_output_tokens: int = 2000

    embedding_model: str = "jina-embeddings-v3"
    embedding_dimension: int = 1024
    embedding_timeout_seconds: int = 30
    embedding_max_retries: int = 3


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


settings = Settings()