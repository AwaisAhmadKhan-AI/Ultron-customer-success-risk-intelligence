from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.ai_insight import AIInsight
from app.models.contact import Contact
from app.models.document import Document
from app.models.enums import TaskStatus
from app.models.interaction import Interaction
from app.models.risk_signal import RiskSignal
from app.models.task import Task


def get_account_overview_data(
    db: Session,
    account_id: UUID,
) -> dict:
    contacts = list(
        db.scalars(
            select(Contact)
            .where(
                Contact.account_id == account_id,
                Contact.archived_at.is_(None),
            )
            .order_by(Contact.created_at.desc())
            .limit(10)
        ).all()
    )

    recent_interactions = list(
        db.scalars(
            select(Interaction)
            .where(
                Interaction.account_id == account_id,
                Interaction.archived_at.is_(None),
            )
            .order_by(Interaction.occurred_at.desc())
            .limit(10)
        ).all()
    )

    open_tasks = list(
        db.scalars(
            select(Task)
            .where(
                Task.account_id == account_id,
                Task.status.in_([
                    TaskStatus.OPEN,
                    TaskStatus.IN_PROGRESS,
                ]),
            )
            .order_by(Task.due_at.asc().nulls_last())
            .limit(10)
        ).all()
    )

    risk_signals = list(
        db.scalars(
            select(RiskSignal)
            .where(RiskSignal.account_id == account_id)
            .order_by(RiskSignal.created_at.desc())
            .limit(10)
        ).all()
    )

    documents = list(
        db.scalars(
            select(Document)
            .where(
                Document.account_id == account_id,
                Document.archived_at.is_(None),
            )
            .order_by(Document.created_at.desc())
            .limit(10)
        ).all()
    )

    recent_ai_insights = list(
        db.scalars(
            select(AIInsight)
            .where(AIInsight.account_id == account_id)
            .order_by(AIInsight.created_at.desc())
            .limit(5)
        ).all()
    )

    return {
        "contacts": contacts,
        "recent_interactions": recent_interactions,
        "open_tasks": open_tasks,
        "risk_signals": risk_signals,
        "documents": documents,
        "recent_ai_insights": recent_ai_insights,
    }