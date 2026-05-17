from pydantic import BaseModel, Field, UUID4 , model_validator
from typing import Optional, List
from typing import Optional, List
from datetime import datetime
from app.models.models import RoleEnum, GoalStatusEnum, UoMTypeEnum, ProgressStatusEnum


# ── Auth ────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email:    str
    password: str

class TokenResponse(BaseModel):
    token: str
    user:  "UserOut"

class UserOut(BaseModel):
    id:         UUID4
    name:       str
    email:      str
    role:       RoleEnum
    department: Optional[str]
    manager_id: Optional[UUID4]

    class Config:
        from_attributes = True  # allows building from SQLAlchemy model instances


# ── Thrust Areas ────────────────────────────────────────────────────
class ThrustAreaOut(BaseModel):
    id:   UUID4
    name: str
    class Config:
        from_attributes = True


# ── Cycles ──────────────────────────────────────────────────────────
class CycleOut(BaseModel):
    id:     UUID4
    year:   int
    phase:  str  # e.g., "Q1", "H1"
    class Config:
        from_attributes = True


# ── Goals ───────────────────────────────────────────────────────────
class GoalCreate(BaseModel):
    title:          str      = Field(..., min_length=3, max_length=200)
    description:    Optional[str] = None
    thrust_area_id: UUID4
    uom_type:       UoMTypeEnum
    target:         float    = Field(..., ge=0)
    # ge=10: greater than or equal to 10 — BRD minimum weightage rule
    weightage:      float    = Field(..., ge=10, le=100)

    @model_validator(mode='after')
    def check_zero_uom_target(self):
        # If UoM is ZERO, target MUST be 0 — anything else makes no sense
        if self.uom_type == UoMTypeEnum.ZERO and self.target != 0:
            raise ValueError("Target must be 0 for ZERO-type goals")
        # If UoM is NOT ZERO, target must be positive
        if self.uom_type != UoMTypeEnum.ZERO and self.target <= 0:
            raise ValueError("Target must be greater than 0 for this UoM type")
        return self

class GoalUpdate(BaseModel):
    title:          Optional[str]         = Field(None, min_length=3)
    description:    Optional[str]         = None
    thrust_area_id: Optional[UUID4]       = None
    uom_type:       Optional[UoMTypeEnum] = None
    target:         Optional[float]       = Field(None, ge=0)
    weightage:      Optional[float]       = Field(None, ge=10, le=100)

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "title": "Updated goal title",
                "weightage": 40
            }]
        }
    }

class ManagerGoalEdit(BaseModel):
    target:    Optional[float] = Field(None, gt=0)
    weightage: Optional[float] = Field(None, ge=10, le=100)

class CheckInOut(BaseModel):
    id:              UUID4
    quarter:         str
    actual:          Optional[float]
    completion_date: Optional[datetime]
    progress_status: ProgressStatusEnum
    score:           Optional[float]
    manager_comment: Optional[str]
    class Config:
        from_attributes = True

class GoalOut(BaseModel):
    id:             UUID4
    title:          str
    description:    Optional[str]
    uom_type:       UoMTypeEnum
    target:         float
    weightage:      float
    status:         GoalStatusEnum
    is_shared:      bool
    shared_from_id: Optional[UUID4]
    locked_at:      Optional[datetime]
    created_at:     datetime
    thrust_area:    Optional[ThrustAreaOut]
    check_ins:      List[CheckInOut] = []
    class Config:
        from_attributes = True


# ── Check-ins ───────────────────────────────────────────────────────
class CheckInCreate(BaseModel):
    goal_id:         UUID4
    quarter:         str    = Field(..., pattern="^Q[1-4]$")
    actual:          Optional[float] = None
    completion_date: Optional[datetime] = None
    progress_status: ProgressStatusEnum = ProgressStatusEnum.NOT_STARTED

class CommentAdd(BaseModel):
    comment: str = Field(..., min_length=1, max_length=1000)


# ── Admin ───────────────────────────────────────────────────────────
class SharedGoalPush(BaseModel):
    employee_ids:   List[UUID4]
    title:          str
    thrust_area_id: UUID4
    uom_type:       UoMTypeEnum
    target:         float
    weightage:      float

class AuditLogOut(BaseModel):
    id:            UUID4
    goal_id:       UUID4
    changed_by_id: UUID4
    goal_title:    Optional[str] = None
    field:         str
    old_value:     Optional[str]
    new_value:     Optional[str]
    reason:        Optional[str]
    created_at:    datetime
    class Config:
        from_attributes = True
