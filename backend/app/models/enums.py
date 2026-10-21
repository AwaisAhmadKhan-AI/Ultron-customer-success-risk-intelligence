from enum import Enum


class UserRole(str, Enum):
    CSM = "csm"
    ADMIN_MANAGER = "admin_manager"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    AT_RISK = "at_risk"
    RENEWAL_PENDING = "renewal_pending"
    CHURNED = "churned"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class InteractionType(str, Enum):
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    NOTE = "note"

class TaskStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class RiskSignalType(str, Enum):
    RENEWAL_RISK = "renewal_risk"
    LOW_ENGAGEMENT = "low_engagement"
    SUPPORT_ESCALATION = "support_escalation"
    NEGATIVE_FEEDBACK = "negative_feedback"
    OTHER = "other"


class RiskSignalSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskSignalStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class RiskSignalOrigin(str, Enum):
    MANUAL = "manual"
    RULE = "rule"

class DocumentIngestionStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"

class AIInsightStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class AIInsightConfidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"