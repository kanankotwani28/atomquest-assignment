from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.models import Goal, GoalStatusEnum, Cycle, User, RoleEnum, ThrustArea
from app.schemas.schemas import GoalCreate, GoalUpdate, GoalOut, ManagerGoalEdit, ThrustAreaOut, CycleOut, SharedGoalPush
from app.dependencies import get_current_user, require_role
from app.services.audit_logger import log_change
from datetime import datetime

router = APIRouter(prefix="/goals", tags=["Goals"])

def get_active_cycle(db: Session) -> Cycle:
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="No active cycle found")
    return cycle

def mark_sheet_for_revision(db: Session, employee_id, cycle_id, changed_by_id):
    approved_goals = db.query(Goal).filter(
        Goal.owner_id == employee_id,
        Goal.cycle_id == cycle_id,
        Goal.status == GoalStatusEnum.APPROVED
    ).all()

    for goal in approved_goals:
        goal.status = GoalStatusEnum.REVISION_REQUIRED
        goal.locked_at = None
        log_change(
            db,
            goal.id,
            changed_by_id,
            "status",
            "APPROVED",
            "REVISION_REQUIRED",
            "Shared KPI added; employee must rebalance weightage"
        )

    return bool(approved_goals)

# ── Thrust areas ──────────────────────────────────────────────────
@router.get("/thrust-areas", response_model=List[ThrustAreaOut])
def get_thrust_areas(db: Session = Depends(get_db),
                     _=Depends(get_current_user)):
    return db.query(ThrustArea).order_by(ThrustArea.name).all()

# ── Get active cycle ───────────────────────────────────────────────
@router.get("/cycle", response_model=CycleOut)
def get_active_cycle_endpoint(db: Session = Depends(get_db),
                              _=Depends(get_current_user)):
    cycle = get_active_cycle(db)
    return cycle

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
    update_data = body.model_dump(exclude_unset=True)
    if goal.is_shared or goal.status == GoalStatusEnum.REVISION_REQUIRED:
        if set(update_data.keys()) != {"weightage"}:
            raise HTTPException(
                status_code=400,
                detail="Revision mode allows weightage changes only. Title, target, UoM and thrust area are read-only."
            )
    elif goal.status not in [GoalStatusEnum.DRAFT, GoalStatusEnum.RETURNED]:
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

    # If this goal was RETURNED and the employee edits it, automatically mark it SUBMITTED
    was_returned = (goal.status == GoalStatusEnum.RETURNED)
    was_revision = (goal.status == GoalStatusEnum.REVISION_REQUIRED)

    for field, value in update_data.items():
        setattr(goal, field, value)

    if was_returned and not goal.is_shared:
        goal.status = GoalStatusEnum.SUBMITTED
    if was_revision:
        goal.status = GoalStatusEnum.SUBMITTED

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
        Goal.status.in_([GoalStatusEnum.DRAFT, GoalStatusEnum.RETURNED, GoalStatusEnum.REVISION_REQUIRED])
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
            GoalStatusEnum.RETURNED,
            GoalStatusEnum.REVISION_REQUIRED
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

@router.get("/team")
def get_team_goals(db: Session = Depends(get_db),
                   current_user: User = Depends(require_role(RoleEnum.MANAGER))):
    cycle = get_active_cycle(db)

    # Select only safe fields — never expose password
    subordinates = db.query(User).filter(
        User.manager_id == current_user.id
    ).all()

    team = []
    for emp in subordinates:
        goals = (db.query(Goal)
                   .filter(Goal.owner_id == emp.id, Goal.cycle_id == cycle.id)
                   .order_by(Goal.created_at).all())
        total_w   = sum(g.weightage for g in goals)
        submitted = sum(1 for g in goals if g.status == GoalStatusEnum.SUBMITTED)
        approved  = sum(1 for g in goals if g.status == GoalStatusEnum.APPROVED)
        revision  = sum(1 for g in goals if g.status == GoalStatusEnum.REVISION_REQUIRED)

        team.append({
            "employee": {
                "id":         str(emp.id),
                "name":       emp.name,
                "email":      emp.email,
                "department": emp.department,
                "role":       emp.role
                # password intentionally excluded
            },
            "goals":          goals,
            "totalWeightage": total_w,
            "submittedCount": submitted,
            "approvedCount":  approved,
            "revisionCount":  revision
        })

    return {"team": team, "cycle": cycle}

@router.post("/team/shared-goals")
def push_team_shared_goal(body: SharedGoalPush,
                          db: Session = Depends(get_db),
                          current_user: User = Depends(require_role(RoleEnum.MANAGER))):
    cycle = get_active_cycle(db)
    requested_ids = {str(emp_id) for emp_id in body.employee_ids}
    found_employees = db.query(User).filter(
        User.id.in_(requested_ids),
        User.role == RoleEnum.EMPLOYEE
    ).all()

    found_ids = {str(emp.id) for emp in found_employees}
    if found_ids != requested_ids:
        raise HTTPException(status_code=404, detail="One or more employees were not found")

    employees_by_id = {str(emp.id): emp for emp in found_employees}
    employees = [employees_by_id[str(emp_id)] for emp_id in body.employee_ids]
    unauthorized = [emp.name for emp in employees if str(emp.manager_id) != str(current_user.id)]
    if unauthorized:
        raise HTTPException(
            status_code=403,
            detail=f"Can only push goals to your direct reports: {', '.join(unauthorized)}"
        )

    # Pre-check: ensure pushing this shared goal will not cause any employee's
    # approved weightage to exceed 100%. Return structured error with details.
    blocked = []
    for emp in employees:
        approved_total = db.query(func.sum(Goal.weightage)).filter(
            Goal.owner_id == emp.id,
            Goal.cycle_id == cycle.id,
            Goal.status == GoalStatusEnum.APPROVED
        ).scalar() or 0
        after_total = approved_total + body.weightage
        if after_total > 100:
            blocked.append({
                "id": str(emp.id),
                "name": emp.name,
                "email": emp.email,
                "approved_total": approved_total,
                "would_be": after_total
            })
    if blocked:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Cannot push shared goal — would exceed 100% approved weightage for some employees",
                "blocked": blocked
            }
        )

    now = datetime.utcnow()
    primary_goal = None
    for emp in employees:
        needs_revision = mark_sheet_for_revision(db, emp.id, cycle.id, current_user.id)
        goal = Goal(
            title=body.title,
            thrust_area_id=str(body.thrust_area_id),
            uom_type=body.uom_type,
            target=body.target,
            weightage=body.weightage,
            owner_id=emp.id,
            cycle_id=cycle.id,
            is_shared=True,
            status=GoalStatusEnum.REVISION_REQUIRED if needs_revision else GoalStatusEnum.APPROVED,
            locked_at=None if needs_revision else now
        )
        db.add(goal)
        db.flush()
        if primary_goal is None:
            primary_goal = goal
            primary_goal.shared_from_id = primary_goal.id
        else:
            goal.shared_from_id = primary_goal.id
        if needs_revision:
            log_change(
                db,
                goal.id,
                current_user.id,
                "status",
                "APPROVED",
                "REVISION_REQUIRED",
                "Shared KPI added; employee must rebalance weightage"
            )

    db.commit()
    return {"message": f"Departmental KPI pushed to {len(employees)} employee(s)"}

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
        Goal.status.in_([GoalStatusEnum.RETURNED, GoalStatusEnum.DRAFT, GoalStatusEnum.REVISION_REQUIRED])
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
