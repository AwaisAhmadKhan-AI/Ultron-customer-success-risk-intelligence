from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.enums import AIInsightConfidence, AIInsightStatus, RiskLevel


class AIInsightCreate(BaseModel):
    question: str = Field(min_length=5, max_length=2000)

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 5:
            raise ValueError("Question must contain at least 5 characters.")
        return value


class EvidenceReference(BaseModel):
    source_type: Literal["document_chunk", "interaction"]
    source_id: UUID


class RiskFactorOutput(BaseModel):
    description: str = Field(min_length=1, max_length=800)
    evidence: list[EvidenceReference] = Field(min_length=1, max_length=6)


class RecommendationOutput(BaseModel):
    action: str = Field(min_length=1, max_length=500)
    rationale: str = Field(min_length=1, max_length=800)
    evidence: list[EvidenceReference] = Field(min_length=1, max_length=6)


class AIModelOutput(BaseModel):
    evidence_sufficient: bool
    summary: str | None
    summary_evidence: list[EvidenceReference] = Field(default_factory=list, max_length=6)
    suggested_risk_level: Literal[
        "low", "medium", "high", "critical"
    ] | None
    risk_factors: list[RiskFactorOutput]
    recommended_actions: list[RecommendationOutput]
    confidence: Literal["low", "medium", "high"] | None

    @model_validator(mode="after")
    def validate_result(self):
        if self.evidence_sufficient:
            if not self.summary or not self.summary.strip():
                raise ValueError(
                    "Sufficient-evidence result requires a summary."
                )

            if self.confidence is None:
                raise ValueError(
                    "Sufficient-evidence result requires confidence."
                )

            if not self.summary_evidence and not self.risk_factors and not self.recommended_actions:
                raise ValueError(
                    "Result must contain cited summary evidence, a supported finding, or an action."
                )

        return self


class AIInsightEvidenceRead(BaseModel):
    id: UUID
    source_type: Literal["document_chunk", "interaction"]
    source_id: UUID
    source_title: str
    source_date: datetime
    excerpt: str
    claim_supported: str | None
    citation_order: int


class AIInsightRead(BaseModel):
    id: UUID
    account_id: UUID
    requested_by_user_id: UUID
    status: AIInsightStatus
    suggested_risk_level: RiskLevel | None
    summary: str | None
    risk_factors: list[dict[str, Any]] | None
    recommended_actions: list[dict[str, Any]] | None
    confidence: AIInsightConfidence | None
    model_name: str | None
    prompt_version: str | None
    created_at: datetime
    completed_at: datetime | None
    error_code: str | None
    evidence: list[AIInsightEvidenceRead] = Field(default_factory=list)