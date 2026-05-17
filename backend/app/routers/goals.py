from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.models import Goal, GoalStatusEnum, Cycle, User, RoleEnum, ThrustArea
from app.schemas.schemas import GoalCreate, GoalUpdate, GoalOut, ManagerGoalEdit, ThrustAreaOut
from app.dependencies import get_current_user, require_role
from app.services.audit_logger import log_change
from datetime import datetime

router = APIRouter(prefix="/goals", tags=["Goals"])

def get_active_cycle(db: Session) -> Cycle:
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="No active cycle found")
    return cycle

# ── Thrust areas ──────────────────────────────────────────────────
@router.get("/thrust-areas", response_model=List[ThrustAreaOut])
def get_thrust_areas(db: Session = Depends(get_db),
                     _=Depends(get_current_user)):
    return db.query(ThrustArea).order_by(ThrustArea.name).all()

# ── Employee: get my goals ────────────────────────────────────────
@router.get("/my", response_model=List[GoalOut])
def get_my_goals(db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    cycle = get_active_cycle(db)
    return (db.query(Goal)
              .filter(Goal.owner_id == current_user.id, Goal.cycle_id == cycle.id)
              .order_by(Goal.created_at)
              .all())

# ── Employee: create goal ─────────────────────────────────────────
@router.post("/", response_model=GoalOut, status_code=201)
def create_goal(body: GoalCreate,
                db: Session = Depends(get_db),
                current_user: User = Depends(require_role(RoleEnum.EMPLOYEE))):
    cycle = get_active_cycle(db)

    # Rule: max 8 goals
    count = db.query(func.count(Goal.id)).filter(
        Goal.owner_id == current_user.id, Goal.cycle_id == cycle.id
    ).scalar()
    if count >= 8:
        raise HTTPException(status_code=400, detail="Maximum of 8 goals allowed per cycle")

    # Rule: total weightage must not exceed 100
    total = db.query(func.sum(Goal.weightage)).filter(
        Goal.owner_id == current_user.id, Goal.cycle_id == cycle.id
    ).scalar() or 0
    if total + body.weightage > 100:
        raise HTTPException(
            status_code=400,
            detail=f"Adding {body.weightage}% would exceed 100%. Current total: {total}%"
        )

    goal = Goal(**body.model_dump(), owner_id=current_user.id, cycle_id=cycle.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal

# ── Employee: update goal ─────────────────────────────────────────
@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: str, body: GoalUpdate,
                db: Session = Depends(get_db),
                current_user: User = Depends(require_role(RoleEnum.EMPLOYEE))):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if str(goal.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your goal")
    if goal.status not in [GoalStatusEnum.DRAFT, GoalStatusEnum.RETURNED]:
        raise HTTPException(status_code=400, detail="Cannot edit submitted or approved goal")

    if body.weightage is not None:
        cycle = get_active_cycle(db)
        other_total = db.query(func.sum(Goal.weightage)).filter(
            Goal.owner_id == current_user.id,
            Goal.cycle_id == cycle.id,
            Goal.id != goal.id
        ).scalar() or 0
        if other_total + body.weightage > 100:
            raise HTTPException(status_code=400,
                detail=f"Total would be {other_total + body.weightage}%. Must be ≤ 100%")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)
    return goal

# ── Employee: delete goal ─────────────────────────────────────────
@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: str,
                db: Session = Depends(get_db),
                current_user: User = Depends(require_role(RoleEnum.EMPLOYEE))):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if str(goal.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your goal")
    if goal.status not in [GoalStatusEnum.DRAFT, GoalStatusEnum.RETURNED]:
        raise HTTPException(status_code=400, detail="Cannot delete submitted or approved goal")
    db.delete(goal)
    db.commit()

# ── Employee: submit all ──────────────────────────────────────────
@router.post("/submit-all")
def submit_all(db: Session = Depends(get_db),
               current_user: User = Depends(require_role(RoleEnum.EMPLOYEE))):
    cycle = get_active_cycle(db)

    # FIXED: include RETURNED goals — employee may resubmit after rework
    submittable = db.query(Goal).filter(
        Goal.owner_id == current_user.id,
        Goal.cycle_id == cycle.id,
        Goal.status.in_([GoalStatusEnum.DRAFT, GoalStatusEnum.RETURNED])
    ).all()

    if not submittable:
        raise HTTPException(
            status_code=400,
            detail="No draft or returned goals to submit"
        )

    # Check total weightage across ALL non-approved goals
    # Include already-submitted goals in the weightage total
    all_active_goals = db.query(Goal).filter(
        Goal.owner_id == current_user.id,
        Goal.cycle_id == cycle.id,
        Goal.status.in_([
            GoalStatusEnum.DRAFT,
            GoalStatusEnum.SUBMITTED,
            GoalStatusEnum.RETURNED
        ])
    ).all()

    total = sum(g.weightage for g in all_active_goals)
    if round(total) != 100:
        raise HTTPException(
            status_code=400,
            detail=f"Total weightage is {total}%. Must equal exactly 100% before submission."
        )

    for g in submittable:
        g.status = GoalStatusEnum.SUBMITTED

    db.commit()
    return {"message": f"{len(submittable)} goal(s) submitted for approval"}

# ── Manager: get team goals ───────────────────────────────────────
@router.get("/team")
def get_team_goals(db: Session = Depends(get_db),
                   current_user: User = Depends(require_role(RoleEnum.MANAGER))):
    cycle = get_active_cycle(db)
    subordinates = db.query(User).filter(User.manager_id == current_user.id).all()

    team = []
    for emp in subordinates:
        goals = (db.query(Goal)
                   .filter(Goal.owner_id == emp.id, Goal.cycle_id == cycle.id)
                   .order_by(Goal.created_at).all())
        total_w   = sum(g.weightage for g in goals)
        submitted = sum(1 for g in goals if g.status == GoalStatusEnum.SUBMITTED)
        approved  = sum(1 for g in goals if g.status == GoalStatusEnum.APPROVED)
        team.append({
            "employee":       emp,
            "goals":          goals,
            "totalWeightage": total_w,
            "submittedCount": submitted,
            "approvedCount":  approved
        })

    return {"team": team, "cycle": cycle}

# ── Manager: approve all goals for an employee ────────────────────
@router.post("/approve")
def approve_goals(payload: dict,
                  db: Session = Depends(get_db),
                  current_user: User = Depends(require_role(RoleEnum.MANAGER))):
    employee_id = payload.get("employeeId")
    if not employee_id:
        raise HTTPException(status_code=400, detail="employeeId required")

    employee = db.query(User).filter(
        User.id == employee_id,
        User.manager_id == current_user.id
    ).first()
    if not employee:
        raise HTTPException(status_code=403, detail="Employee not in your team")

    cycle = get_active_cycle(db)

    # Check no goals are still RETURNED or DRAFT — must all be SUBMITTED
    blocking_goals = db.query(Goal).filter(
        Goal.owner_id == employee_id,
        Goal.cycle_id == cycle.id,
        Goal.status.in_([GoalStatusEnum.RETURNED, GoalStatusEnum.DRAFT])
    ).all()

    if blocking_goals:
        blocking_titles = [g.title for g in blocking_goals]
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve — {len(blocking_goals)} goal(s) still need resubmission: "
                   f"{', '.join(blocking_titles)}"
        )

    # Now fetch only submitted goals
    submitted = db.query(Goal).filter(
        Goal.owner_id == employee_id,
        Goal.cycle_id == cycle.id,
        Goal.status == GoalStatusEnum.SUBMITTED
    ).all()

    if not submitted:
        raise HTTPException(status_code=400, detail="No submitted goals to approve")

    # Final weightage check
    total = sum(g.weightage for g in submitted)
    if round(total) != 100:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve — total weightage is {total}%, must be 100%"
        )

    now = datetime.utcnow()
    for g in submitted:
        g.status    = GoalStatusEnum.APPROVED
        g.locked_at = now
        log_change(db, g.id, current_user.id,
                   "status", "SUBMITTED", "APPROVED", "Approved by manager")

    db.commit()
    return {"message": f"{len(submitted)} goal(s) approved and locked"}

# ── Manager: return a single goal ────────────────────────────────
@router.post("/{goal_id}/return")
def return_goal(goal_id: str, payload: dict,
                db: Session = Depends(get_db),
                current_user: User = Depends(require_role(RoleEnum.MANAGER))):
    reason = payload.get("reason", "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Return reason is required")

    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.status != GoalStatusEnum.SUBMITTED:
        raise HTTPException(status_code=400, detail="Only submitted goals can be returned")
    if str(goal.owner.manager_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your team member")

    goal.status = GoalStatusEnum.RETURNED
    log_change(db, goal.id, current_user.id, "status", "SUBMITTED", "RETURNED", reason)
    db.commit()
    return {"message": "Goal returned for rework"}

# ── Manager: inline edit ──────────────────────────────────────────
@router.put("/{goal_id}/manager-edit", response_model=GoalOut)
def manager_edit_goal(goal_id: str, body: ManagerGoalEdit,
                      db: Session = Depends(get_db),
                      current_user: User = Depends(require_role(RoleEnum.MANAGER))):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if str(goal.owner.manager_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not your team member")
    if goal.status != GoalStatusEnum.SUBMITTED:
        raise HTTPException(status_code=400,
            detail="Can only edit submitted goals. Approved goals require admin.")

    if body.target is not None and body.target != goal.target:
        log_change(db, goal.id, current_user.id, "target", goal.target, body.target,
                   "Edited by manager during review")
        goal.target = body.target

    if body.weightage is not None and body.weightage != goal.weightage:
        log_change(db, goal.id, current_user.id, "weightage", goal.weightage, body.weightage,
                   "Edited by manager during review")
        goal.weightage = body.weightage

    db.commit()
    db.refresh(goal)
    return goal