from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.models.enums import (
    AIInsightConfidence,
    AIInsightStatus,
    RiskLevel,
)
from app.services.ai_insight_service import _serialize_insight


ACCOUNT_ID = uuid4()
INSIGHT_ID = uuid4()
NOW = datetime.now(timezone.utc)


class FakeResult:
    def __init__(self, value):
        self.value = value

    def first(self):
        return self.value


class FakeSerializationDB:
    def __init__(
        self,
        evidence_rows,
        document_sources=None,
        interaction_sources=None,
    ):
        self.evidence_rows = sorted(
            evidence_rows,
            key=lambda item: item.citation_order,
        )
        self.document_sources = document_sources or []
        self.interaction_sources = interaction_sources or []

    def scalars(self, statement):
        return SimpleNamespace(all=lambda: self.evidence_rows)

    def execute(self, statement):
        value = (
            self.document_sources.pop(0)
            if self.document_sources
            else None
        )
        return FakeResult(value)

    def scalar(self, statement):
        return (
            self.interaction_sources.pop(0)
            if self.interaction_sources
            else None
        )


def make_insight():
    return SimpleNamespace(
        id=INSIGHT_ID,
        account_id=ACCOUNT_ID,
        requested_by_user_id=uuid4(),
        status=AIInsightStatus.COMPLETED,
        suggested_risk_level=RiskLevel.HIGH,
        summary="Customer has unresolved support issues.",
        risk_factors=[],
        recommended_actions=[],
        confidence=AIInsightConfidence.MEDIUM,
        model_name="test-model",
        prompt_version="test-prompt-v1",
        created_at=NOW,
        completed_at=NOW,
        error_code=None,
    )


def make_evidence(
    *,
    document_chunk_id=None,
    interaction_id=None,
    citation_order=1,
):
    return SimpleNamespace(
        id=uuid4(),
        account_id=ACCOUNT_ID,
        ai_insight_id=INSIGHT_ID,
        document_chunk_id=document_chunk_id,
        interaction_id=interaction_id,
        excerpt="Two support issues remain unresolved.",
        claim_supported="The account has unresolved support issues.",
        citation_order=citation_order,
    )


def make_document_source():
    chunk = SimpleNamespace(
        id=uuid4(),
        document_id=uuid4(),
        account_id=ACCOUNT_ID,
    )
    document = SimpleNamespace(
        id=chunk.document_id,
        account_id=ACCOUNT_ID,
        title="Customer Support Report",
        created_at=NOW,
    )
    return chunk, document


def make_interaction_source():
    return SimpleNamespace(
        id=uuid4(),
        account_id=ACCOUNT_ID,
        subject="Support follow-up",
        interaction_type=SimpleNamespace(value="call"),
        occurred_at=NOW,
    )


def test_valid_document_citation_is_serialized():
    chunk, document = make_document_source()
    evidence = make_evidence(document_chunk_id=chunk.id)

    db = FakeSerializationDB(
        evidence_rows=[evidence],
        document_sources=[(chunk, document)],
    )

    result = _serialize_insight(db, make_insight())

    assert len(result.evidence) == 1

    citation = result.evidence[0]
    assert citation.source_type == "document_chunk"
    assert citation.source_id == chunk.id
    assert citation.source_title == "Customer Support Report"
    assert citation.excerpt == evidence.excerpt
    assert citation.claim_supported == evidence.claim_supported
    assert citation.citation_order == 1


def test_valid_interaction_citation_is_serialized():
    interaction = make_interaction_source()
    evidence = make_evidence(interaction_id=interaction.id)

    db = FakeSerializationDB(
        evidence_rows=[evidence],
        interaction_sources=[interaction],
    )

    result = _serialize_insight(db, make_insight())

    assert len(result.evidence) == 1

    citation = result.evidence[0]
    assert citation.source_type == "interaction"
    assert citation.source_id == interaction.id
    assert citation.source_title == "Support follow-up"
    assert citation.source_date == NOW
    assert citation.excerpt == evidence.excerpt


def test_unavailable_document_source_is_not_returned():
    evidence = make_evidence(document_chunk_id=uuid4())

    db = FakeSerializationDB(
        evidence_rows=[evidence],
        document_sources=[None],
    )

    result = _serialize_insight(db, make_insight())

    assert result.evidence == []


def test_unavailable_interaction_source_is_not_returned():
    evidence = make_evidence(interaction_id=uuid4())

    db = FakeSerializationDB(
        evidence_rows=[evidence],
        interaction_sources=[None],
    )

    result = _serialize_insight(db, make_insight())

    assert result.evidence == []