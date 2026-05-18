import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Boolean, DateTime,
    ForeignKey, Enum as SAEnum, UniqueConstraint, Integer
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum

# Python enums — SQLAlchemy maps these to PostgreSQL ENUM types
class RoleEnum(str, enum.Enum):
    EMPLOYEE = "EMPLOYEE"
    MANAGER  = "MANAGER"
    ADMIN    = "ADMIN"

class GoalStatusEnum(str, enum.Enum):
    DRAFT     = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED  = "APPROVED"
    RETURNED  = "RETURNED"
    REVISION_REQUIRED = "REVISION_REQUIRED"

class ProgressStatusEnum(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    ON_TRACK    = "ON_TRACK"
    COMPLETED   = "COMPLETED"

class UoMTypeEnum(str, enum.Enum):
    NUMERIC_MIN = "NUMERIC_MIN"
    NUMERIC_MAX = "NUMERIC_MAX"
    PERCENTAGE  = "PERCENTAGE"
    TIMELINE    = "TIMELINE"
    ZERO        = "ZERO"


class User(Base):
    __tablename__ = "users"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String, nullable=False)
    email       = Column(String, unique=True, nullable=False, index=True)
    password    = Column(String, nullable=False)
    role        = Column(SAEnum(RoleEnum), default=RoleEnum.EMPLOYEE, nullable=False)
    department  = Column(String, nullable=True)
    manager_id  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Self-referential relationship — manager is also a User
    manager      = relationship("User", remote_side="User.id", foreign_keys=[manager_id],
                                back_populates="subordinates")
    subordinates = relationship("User", foreign_keys=[manager_id],
                                back_populates="manager")
    goals        = relationship("Goal", back_populates="owner",
                                foreign_keys="Goal.owner_id")


class ThrustArea(Base):
    __tablename__ = "thrust_areas"

    id   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)

    goals = relationship("Goal", back_populates="thrust_area")


class Cycle(Base):
    __tablename__ = "cycles"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    year               = Column(Integer, nullable=False)
    phase              = Column(String, nullable=False)
    start_date         = Column(DateTime, nullable=False)
    end_date           = Column(DateTime, nullable=False)
    is_active          = Column(Boolean, default=False)
    current_quarter    = Column(String, nullable=True)
    checkin_window_open = Column(Boolean, default=False)
    created_at         = Column(DateTime, default=datetime.utcnow)

    goals = relationship("Goal", back_populates="cycle")


class Goal(Base):
    __tablename__ = "goals"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title          = Column(String, nullable=False)
    description    = Column(String, nullable=True)
    thrust_area_id = Column(UUID(as_uuid=True), ForeignKey("thrust_areas.id"), nullable=False)
    uom_type       = Column(SAEnum(UoMTypeEnum), nullable=False)
    target         = Column(Float, nullable=False)
    weightage      = Column(Float, nullable=False)
    status         = Column(SAEnum(GoalStatusEnum), default=GoalStatusEnum.DRAFT)
    is_shared      = Column(Boolean, default=False)
    shared_from_id = Column(UUID(as_uuid=True), nullable=True)
    owner_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cycle_id       = Column(UUID(as_uuid=True), ForeignKey("cycles.id"), nullable=False)
    locked_at      = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner       = relationship("User", back_populates="goals", foreign_keys=[owner_id])
    thrust_area = relationship("ThrustArea", back_populates="goals")
    cycle       = relationship("Cycle", back_populates="goals")
    check_ins   = relationship("CheckIn", back_populates="goal",
                               cascade="all, delete-orphan")
    audit_logs  = relationship("AuditLog", back_populates="goal",
                               cascade="all, delete-orphan")


class CheckIn(Base):
    __tablename__ = "check_ins"
    __table_args__ = (
        # Compound unique constraint — one check-in per goal per quarter
        UniqueConstraint("goal_id", "quarter", name="uq_checkin_goal_quarter"),
    )

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id         = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False)
    quarter         = Column(String, nullable=False)  # Q1 / Q2 / Q3 / Q4
    actual          = Column(Float, nullable=True)
    completion_date = Column(DateTime, nullable=True)
    progress_status = Column(SAEnum(ProgressStatusEnum), default=ProgressStatusEnum.NOT_STARTED)
    score           = Column(Float, nullable=True)
    manager_comment = Column(String, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    goal = relationship("Goal", back_populates="check_ins")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id      = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False)
    changed_by_id= Column(UUID(as_uuid=True), nullable=False)
    field        = Column(String, nullable=False)
    old_value    = Column(String, nullable=True)
    new_value    = Column(String, nullable=True)
    reason       = Column(String, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    goal = relationship("Goal", back_populates="audit_logs")


class EscalationRuleTypeEnum(str, enum.Enum):
    GOAL_NOT_SUBMITTED  = "GOAL_NOT_SUBMITTED"
    GOAL_NOT_APPROVED   = "GOAL_NOT_APPROVED"
    CHECKIN_MISSED      = "CHECKIN_MISSED"


class EscalationLevelEnum(str, enum.Enum):
    EMPLOYEE  = "EMPLOYEE"
    MANAGER   = "MANAGER"
    HR        = "HR"


class EscalationRule(Base):
    __tablename__ = "escalation_rules"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_type      = Column(SAEnum(EscalationRuleTypeEnum), nullable=False, unique=True)
    threshold_days = Column(Integer, nullable=False, default=7)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EscalationLog(Base):
    __tablename__ = "escalation_logs"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rule_type      = Column(SAEnum(EscalationRuleTypeEnum), nullable=False)
    level          = Column(SAEnum(EscalationLevelEnum), default=EscalationLevelEnum.EMPLOYEE)
    triggered_at   = Column(DateTime, default=datetime.utcnow)
    resolved_at    = Column(DateTime, nullable=True)
    notes          = Column(String, nullable=True)
    employee       = relationship("User", foreign_keys=[employee_id])

