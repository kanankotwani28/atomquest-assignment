from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.models import (Goal, GoalStatusEnum, User, RoleEnum,
                                Cycle, AuditLog, CheckIn, ThrustArea)
from app.schemas.schemas import SharedGoalPush, AuditLogOut
from app.dependencies import require_role
from app.services.audit_logger import log_change
from io import BytesIO
import openpyxl, uuid
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["Admin"])

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

# ── Completion dashboard ──────────────────────────────────────────
@router.get("/completion")
def completion_dashboard(db: Session = Depends(get_db),
                         _=Depends(require_role(RoleEnum.ADMIN))):
    cycle      = db.query(Cycle).filter(Cycle.is_active == True).first()
    employees  = db.query(User).filter(User.role == RoleEnum.EMPLOYEE).all()

    results = []
    for emp in employees:
        goals     = db.query(Goal).filter(Goal.owner_id == emp.id,
                                          Goal.cycle_id == cycle.id).all()
        submitted = any(g.status in [GoalStatusEnum.SUBMITTED,
                                     GoalStatusEnum.APPROVED] for g in goals)
        approved  = all(g.status == GoalStatusEnum.APPROVED for g in goals) and len(goals) > 0

        checkin_quarters = set()
        for g in goals:
            for ci in g.check_ins:
                checkin_quarters.add(ci.quarter)

        results.append({
            "employee":         emp.name,
            "department":       emp.department,
            "goalsSubmitted":   submitted,
            "goalsApproved":    approved,
            "checkInsCompleted": sorted(checkin_quarters)
        })

    return results

# ── Audit trail ───────────────────────────────────────────────────
@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(db: Session = Depends(get_db),
                   _=Depends(require_role(RoleEnum.ADMIN))):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(500).all()

# ── Unlock a goal (post-approval edit) ───────────────────────────
@router.post("/goals/{goal_id}/unlock")
def unlock_goal(goal_id: str, db: Session = Depends(get_db),
                current_user: User = Depends(require_role(RoleEnum.ADMIN))):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    goal.status    = GoalStatusEnum.DRAFT
    goal.locked_at = None
    db.commit()
    return {"message": "Goal unlocked — returned to DRAFT"}

# ── Push shared goal to multiple employees ────────────────────────
@router.post("/shared-goals")
def push_shared_goal(body: SharedGoalPush,
                     db: Session = Depends(get_db),
                     current_user: User = Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
    if not cycle:
        raise HTTPException(404, "No active cycle")

    created = []
    primary_goal = None
    for emp_id in body.employee_ids:
        needs_revision = mark_sheet_for_revision(db, emp_id, cycle.id, current_user.id)
        goal = Goal(
            title          = body.title,
            thrust_area_id = str(body.thrust_area_id),
            uom_type       = body.uom_type,
            target         = body.target,
            weightage      = body.weightage,
            owner_id       = str(emp_id),
            cycle_id       = cycle.id,
            is_shared      = True,
            status         = GoalStatusEnum.REVISION_REQUIRED if needs_revision else GoalStatusEnum.APPROVED,
            locked_at      = None if needs_revision else datetime.utcnow()
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
        created.append(str(emp_id))

    db.commit()
    return {"message": f"Shared goal pushed to {len(created)} employees"}

# ── Excel achievement report ──────────────────────────────────────
@router.get("/reports/achievement")
def achievement_report(db: Session = Depends(get_db),
                       _=Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Achievement Report"

    # Header row
    headers = ["Employee", "Department", "Goal Title", "Thrust Area",
               "UoM", "Target", "Weightage",
               "Q1 Actual", "Q1 Score",
               "Q2 Actual", "Q2 Score",
               "Q3 Actual", "Q3 Score",
               "Q4 Actual", "Q4 Score"]
    ws.append(headers)

    employees = db.query(User).filter(User.role == RoleEnum.EMPLOYEE).all()
    for emp in employees:
        goals = db.query(Goal).filter(
            Goal.owner_id == emp.id, Goal.cycle_id == cycle.id
        ).all()
        for g in goals:
            ci_map = {ci.quarter: ci for ci in g.check_ins}
            row = [
                emp.name, emp.department or "",
                g.title, g.thrust_area.name if g.thrust_area else "",
                g.uom_type.value, g.target, g.weightage
            ]
            for q in ["Q1", "Q2", "Q3", "Q4"]:
                ci = ci_map.get(q)
                row.extend([ci.actual if ci else "", ci.score if ci else ""])
            ws.append(row)

    # Stream file directly — no temp file needed
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=achievement_report.xlsx"}
    )

# ── Cycle management ──────────────────────────────────────────────
@router.get("/cycles")
def list_cycles(db: Session = Depends(get_db),
                _=Depends(require_role(RoleEnum.ADMIN))):
    return db.query(Cycle).order_by(Cycle.year.desc()).all()

@router.post("/cycles/{cycle_id}/activate")
def activate_cycle(cycle_id: str, db: Session = Depends(get_db),
                   _=Depends(require_role(RoleEnum.ADMIN))):
    # Deactivate all, then activate the chosen one
    db.query(Cycle).update({"is_active": False})
    cycle = db.query(Cycle).filter(Cycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(404, "Cycle not found")
    cycle.is_active = True
    db.commit()
    return {"message": f"Cycle {cycle.year} activated"}

@router.post("/cycles")
def create_cycle(payload: dict, db: Session = Depends(get_db),
                 _=Depends(require_role(RoleEnum.ADMIN))):
    year = payload.get("year")
    phase = payload.get("phase")
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    is_active = bool(payload.get("is_active", False))

    if not all([year, phase, start_date, end_date]):
        raise HTTPException(400, "year, phase, start_date and end_date are required")

    if is_active:
        db.query(Cycle).update({"is_active": False})

    cycle = Cycle(
        year=int(year),
        phase=phase,
        start_date=datetime.fromisoformat(start_date),
        end_date=datetime.fromisoformat(end_date),
        is_active=is_active
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return cycle

# ── Org hierarchy ─────────────────────────────────────────────────
@router.get("/users")
def list_users(db: Session = Depends(get_db),
               _=Depends(require_role(RoleEnum.ADMIN))):
    users = db.query(User).order_by(User.role, User.name).all()
    return [{
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "role": u.role.value,
        "department": u.department,
        "manager_id": str(u.manager_id) if u.manager_id else None,
    } for u in users]

@router.put("/users/{user_id}/manager")
def update_manager(user_id: str, payload: dict, db: Session = Depends(get_db),
                   _=Depends(require_role(RoleEnum.ADMIN))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    manager_id = payload.get("manager_id")
    if manager_id:
        manager = db.query(User).filter(
            User.id == manager_id,
            User.role == RoleEnum.MANAGER
        ).first()
        if not manager:
            raise HTTPException(404, "Manager not found")
        if str(manager.id) == str(user.id):
            raise HTTPException(400, "User cannot report to themselves")

    user.manager_id = manager_id or None
    db.commit()
    db.refresh(user)
    return {"message": "Reporting manager updated"}

# ── Goal oversight ────────────────────────────────────────────────
@router.get("/goals")
def list_goals(db: Session = Depends(get_db),
               _=Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
    if not cycle:
        raise HTTPException(404, "No active cycle")

    goals = db.query(Goal).filter(Goal.cycle_id == cycle.id).order_by(Goal.created_at.desc()).all()
    return [{
        "id": str(g.id),
        "title": g.title,
        "owner": g.owner.name if g.owner else "",
        "department": g.owner.department if g.owner else "",
        "thrustArea": g.thrust_area.name if g.thrust_area else "",
        "status": g.status.value,
        "weightage": g.weightage,
        "target": g.target,
        "uomType": g.uom_type.value,
        "isShared": g.is_shared,
        "lockedAt": g.locked_at,
    } for g in goals]
