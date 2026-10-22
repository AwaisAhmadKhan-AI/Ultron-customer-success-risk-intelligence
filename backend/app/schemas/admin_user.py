from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class AdminUserCreate(BaseModel):
    """Input for an administrator creating a CSM account; callers cannot set role."""

    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=3, max_length=320)
    password: SecretStr = Field(min_length=12, max_length=128)

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name must not be blank.")
        return value

    @field_validator("email")
    @classmethod
    def normalize_and_validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if (
            len(value) > 320
            or value.count("@") != 1
            or any(character.isspace() for character in value)
        ):
            raise ValueError("Enter a valid email address.")
        local_part, domain = value.split("@", 1)
        if not local_part or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("Enter a valid email address.")
        return value
