from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import (Goal, GoalStatusEnum, CheckIn,
                                User, RoleEnum, Cycle)
from app.schemas.schemas import CheckInCreate, CommentAdd
from app.dependencies import get_current_user, require_role
from app.services.scoring_engine import calculate_score
from datetime import datetime
from app.config import settings

router = APIRouter(prefix="/checkins", tags=["Check-ins"])

def get_active_cycle(db):
    c = db.query(Cycle).filter(Cycle.is_active == True).first()
    if not c: raise HTTPException(404, "No active cycle")
    return c

def get_current_quarter() -> str | None:
    m = datetime.utcnow().month
    if 7  <= m <= 9:  return "Q1"
    if 10 <= m <= 12: return "Q2"
    if 1  <= m <= 2:  return "Q3"
    if 3  <= m <= 4:  return "Q4"
    return None  # May/June is goal-setting phase; no check-in window.

def upsert_checkin_record(db, goal, body, score):
    existing = db.query(CheckIn).filter(
        CheckIn.goal_id == goal.id,
        CheckIn.quarter == body.quarter
    ).first()

    if existing:
        existing.actual          = body.actual
        existing.completion_date = body.completion_date
        existing.progress_status = body.progress_status
        existing.score           = score
        existing.updated_at      = datetime.utcnow()
        return existing

    ci = CheckIn(
        goal_id         = goal.id,
        quarter         = body.quarter,
        actual          = body.actual,
        completion_date = body.completion_date,
        progress_status = body.progress_status,
        score           = score
    )
    db.add(ci)
    return ci

# ── Employee: upsert check-in 
@router.post("/")
def upsert_checkin(body: CheckInCreate,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(require_role(RoleEnum.EMPLOYEE))):
    goal = db.query(Goal).filter(Goal.id == str(body.goal_id)).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    if str(goal.owner_id) != str(current_user.id):
        raise HTTPException(403, "Not your goal")
    if goal.status != GoalStatusEnum.APPROVED:
        raise HTTPException(400, "Check-ins only allowed on approved goals")

    current_quarter = get_current_quarter()
    # Allow bypass in dev/testing via env flag
    if not settings.allow_checkin_outside_window:
        if current_quarter is None:
            raise HTTPException(400, "Check-in window is closed. May/June is goal-setting phase.")
        if body.quarter != current_quarter:
            raise HTTPException(
                400,
                f"{body.quarter} check-in is not open. Current open window is {current_quarter}."
            )
    else:
        # In permissive mode, accept the requested quarter if provided
        current_quarter = body.quarter or current_quarter

    score = calculate_score(goal.uom_type, goal.target, body.actual, body.completion_date)

    if goal.is_shared and goal.shared_from_id:
        if str(goal.id) != str(goal.shared_from_id):
            raise HTTPException(
                403,
                "Shared KPI achievement updates can be entered only by the primary owner."
            )

    saved = upsert_checkin_record(db, goal, body, score)

    if goal.is_shared and goal.shared_from_id:
        linked_goals = db.query(Goal).filter(
            Goal.shared_from_id == goal.shared_from_id,
            Goal.id != goal.id
        ).all()
        for linked_goal in linked_goals:
            linked_score = calculate_score(
                linked_goal.uom_type,
                linked_goal.target,
                body.actual,
                body.completion_date
            )
            upsert_checkin_record(db, linked_goal, body, linked_score)

    db.commit()
    db.refresh(saved)
    return saved

# ── Employee: get my check-ins ────────────────────────────────────
@router.get("/my")
def get_my_checkins(db: Session = Depends(get_db),
                    current_user: User = Depends(require_role(RoleEnum.EMPLOYEE))):
    cycle = get_active_cycle(db)
    goals = (db.query(Goal)
               .filter(Goal.owner_id == current_user.id,
                       Goal.cycle_id == cycle.id,
                       Goal.status == GoalStatusEnum.APPROVED)
               .all())
    return {
        "goals": goals,
        "currentQuarter": get_current_quarter(),
        "cycle": cycle,
        "allowCheckinOutsideWindow": settings.allow_checkin_outside_window
    }

# ── Manager: team check-ins ───────────────────────────────────────
@router.get("/team")
def get_team_checkins(db: Session = Depends(get_db),
                      current_user: User = Depends(require_role(RoleEnum.MANAGER))):
    cycle = get_active_cycle(db)
    subs  = db.query(User).filter(User.manager_id == current_user.id).all()
    team  = []
    for emp in subs:
        goals = db.query(Goal).filter(
            Goal.owner_id == emp.id,
            Goal.cycle_id == cycle.id,
            Goal.status   == GoalStatusEnum.APPROVED
        ).all()

        weighted, total_w = 0, 0
        for g in goals:
            if g.check_ins:
                latest = sorted(g.check_ins, key=lambda c: c.quarter)[-1]
                if latest.score is not None:
                    weighted += latest.score * g.weightage
                    total_w  += g.weightage
        overall = round(weighted / total_w, 2) if total_w else None

        team.append({
            "employee": {
                "id":         str(emp.id),
                "name":       emp.name,
                "email":      emp.email,
                "department": emp.department,
                "role":       emp.role
                # password excluded
            },
            "goals":        goals,
            "overallScore": overall
        })

    return {"team": team, "cycle": cycle, "currentQuarter": get_current_quarter()}

# ── Manager: add comment ──────────────────────────────────────────
@router.put("/{checkin_id}/comment")
def add_comment(checkin_id: str, body: CommentAdd,
                db: Session = Depends(get_db),
                current_user: User = Depends(require_role(RoleEnum.MANAGER))):
    ci = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
    if not ci:
        raise HTTPException(404, "Check-in not found")
    if str(ci.goal.owner.manager_id) != str(current_user.id):
        raise HTTPException(403, "Not your team member")
    ci.manager_comment = body.comment
    db.commit()
    db.refresh(ci)
    return ci
