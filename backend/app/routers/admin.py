from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db, SessionLocal
from app.models.models import (Goal, GoalStatusEnum, User, RoleEnum,
                                Cycle, AuditLog, CheckIn, ThrustArea)
from app.schemas.schemas import SharedGoalPush
from app.dependencies import require_role
from app.services.audit_logger import log_change
from io import BytesIO
import openpyxl
from datetime import datetime
import csv, io, json, asyncio

router = APIRouter(prefix="/admin", tags=["Admin"])

# ── Completion dashboard ──────────────────────────────────────────
@router.get("/completion")
def completion_dashboard(db: Session = Depends(get_db),
                         _=Depends(require_role(RoleEnum.ADMIN))):
    cycle     = db.query(Cycle).filter(Cycle.is_active == True).first()
    employees = db.query(User).filter(User.role == RoleEnum.EMPLOYEE).all()

    results = []
    for emp in employees:
        goals = db.query(Goal).filter(
            Goal.owner_id == emp.id,
            Goal.cycle_id == cycle.id
        ).all()

        submitted = any(g.status in [GoalStatusEnum.SUBMITTED,
                                     GoalStatusEnum.APPROVED] for g in goals)
        approved  = all(g.status == GoalStatusEnum.APPROVED
                        for g in goals) and len(goals) > 0

        # Collect completed check-in quarters
        checkin_quarters = set()
        for g in goals:
            for ci in g.check_ins:
                checkin_quarters.add(ci.quarter)

        results.append({
            "employee":          emp.name,
            "department":        emp.department or "",
            "goalsSubmitted":    submitted,
            "goalsApproved":     approved,
            "checkInsCompleted": sorted(checkin_quarters)
        })

    return results

# ── Audit trail ───────────────────────────────────────────────────
@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db),
                   _=Depends(require_role(RoleEnum.ADMIN))):
    logs   = db.query(AuditLog).order_by(
                 AuditLog.created_at.desc()
             ).limit(500).all()
    result = []
    for l in logs:
        try:
            goal_title = l.goal.title if l.goal else "Deleted goal"
        except Exception:
            goal_title = "Unknown"

        try:
            changed_by = str(l.changed_by_id) if l.changed_by_id else None
        except Exception:
            changed_by = None

        result.append({
            "id":            str(l.id),
            "goal_id":       str(l.goal_id),
            "goal_title":    goal_title,
            "changed_by_id": changed_by,
            "field":         l.field,
            "old_value":     l.old_value,
            "new_value":     l.new_value,
            "reason":        l.reason,
            "created_at":    l.created_at.isoformat() if l.created_at else None
        })
    return result

# ── Unlock a goal ─────────────────────────────────────────────────
@router.post("/goals/{goal_id}/unlock")
def unlock_goal(goal_id: str,
                db: Session = Depends(get_db),
                current_user: User = Depends(require_role(RoleEnum.ADMIN))):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    goal.status    = GoalStatusEnum.DRAFT
    goal.locked_at = None
    db.commit()
    return {"message": "Goal unlocked — returned to DRAFT"}

# ── Push shared goal ──────────────────────────────────────────────
@router.post("/shared-goals")
def push_shared_goal(body: SharedGoalPush,
                     db: Session = Depends(get_db),
                     current_user: User = Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
    if not cycle:
        raise HTTPException(404, "No active cycle")

    results = []
    blocked = []

    for emp_id in body.employee_ids:
        existing_total = db.query(func.sum(Goal.weightage)).filter(
            Goal.owner_id == str(emp_id),
            Goal.cycle_id == cycle.id
        ).scalar() or 0

        if existing_total + body.weightage > 100:
            available = 100 - existing_total
            blocked.append({
                "employee_id": str(emp_id),
                "reason": f"Current total is {existing_total}%. "
                          f"Only {available}% available."
            })
            continue

        goal = Goal(
            title          = body.title,
            thrust_area_id = str(body.thrust_area_id),
            uom_type       = body.uom_type,
            target         = body.target,
            weightage      = body.weightage,
            owner_id       = str(emp_id),
            cycle_id       = cycle.id,
            is_shared      = True,
            status         = GoalStatusEnum.APPROVED,
            locked_at      = datetime.utcnow()
        )
        db.add(goal)
        results.append(str(emp_id))

    db.commit()

    response = {
        "pushed_to": len(results),
        "blocked":   len(blocked),
        "message":   f"Shared goal pushed to {len(results)} employee(s)."
    }
    if blocked:
        response["warning"] = (
            f"{len(blocked)} employee(s) skipped — weightage would exceed 100%."
        )
        response["blocked_details"] = blocked
    return response

# ── Excel report ──────────────────────────────────────────────────
@router.get("/reports/achievement")
def achievement_report(db: Session = Depends(get_db),
                       _=Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
    wb    = openpyxl.Workbook()
    ws    = wb.active
    ws.title = "Achievement Report"
    ws.append(["Employee","Department","Goal Title","Thrust Area",
               "UoM","Target","Weightage",
               "Q1 Actual","Q1 Score","Q2 Actual","Q2 Score",
               "Q3 Actual","Q3 Score","Q4 Actual","Q4 Score"])

    for emp in db.query(User).filter(User.role == RoleEnum.EMPLOYEE).all():
        for g in db.query(Goal).filter(
            Goal.owner_id == emp.id, Goal.cycle_id == cycle.id
        ).all():
            ci_map = {ci.quarter: ci for ci in g.check_ins}
            row = [emp.name, emp.department or "", g.title,
                   g.thrust_area.name if g.thrust_area else "",
                   g.uom_type.value, g.target, g.weightage]
            for q in ["Q1","Q2","Q3","Q4"]:
                ci = ci_map.get(q)
                row.extend([ci.actual if ci else "", ci.score if ci else ""])
            ws.append(row)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=achievement_report.xlsx"}
    )

# ── CSV report ────────────────────────────────────────────────────
@router.get("/reports/achievement/csv")
def achievement_report_csv(db: Session = Depends(get_db),
                           _=Depends(require_role(RoleEnum.ADMIN))):
    cycle  = db.query(Cycle).filter(Cycle.is_active == True).first()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Employee","Department","Goal Title","Thrust Area",
                     "UoM","Target","Weightage",
                     "Q1 Actual","Q1 Score","Q2 Actual","Q2 Score",
                     "Q3 Actual","Q3 Score","Q4 Actual","Q4 Score"])

    for emp in db.query(User).filter(User.role == RoleEnum.EMPLOYEE).all():
        for g in db.query(Goal).filter(
            Goal.owner_id == emp.id, Goal.cycle_id == cycle.id
        ).all():
            ci_map = {ci.quarter: ci for ci in g.check_ins}
            row = [emp.name, emp.department or "", g.title,
                   g.thrust_area.name if g.thrust_area else "",
                   g.uom_type.value, g.target, g.weightage]
            for q in ["Q1","Q2","Q3","Q4"]:
                ci = ci_map.get(q)
                row.extend([ci.actual if ci else "", ci.score if ci else ""])
            writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=achievement_report.csv"}
    )

# ── SSE completion stream ─────────────────────────────────────────
@router.get("/completion/stream")
def completion_stream(_=Depends(require_role(RoleEnum.ADMIN))):
    async def event_generator():
        while True:
            db = SessionLocal()
            try:
                cycle     = db.query(Cycle).filter(Cycle.is_active == True).first()
                employees = db.query(User).filter(
                    User.role == RoleEnum.EMPLOYEE
                ).all()
                results = []
                for emp in employees:
                    goals = db.query(Goal).filter(
                        Goal.owner_id == emp.id,
                        Goal.cycle_id == cycle.id
                    ).all()
                    submitted = any(g.status in [GoalStatusEnum.SUBMITTED,
                                                 GoalStatusEnum.APPROVED]
                                    for g in goals)
                    approved  = all(g.status == GoalStatusEnum.APPROVED
                                    for g in goals) and len(goals) > 0
                    quarters  = sorted({ci.quarter
                                        for g in goals
                                        for ci in g.check_ins})
                    results.append({
                        "employee":          emp.name,
                        "goalsSubmitted":    submitted,
                        "goalsApproved":     approved,
                        "checkInsCompleted": quarters
                    })
                yield f"data: {json.dumps({'team': results})}\n\n"
            finally:
                db.close()
            await asyncio.sleep(5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )

# ── Cycles ────────────────────────────────────────────────────────
@router.get("/cycles")
def list_cycles(db: Session = Depends(get_db),
                _=Depends(require_role(RoleEnum.ADMIN))):
    return db.query(Cycle).order_by(Cycle.year.desc()).all()

@router.post("/cycles/{cycle_id}/activate")
def activate_cycle(cycle_id: str,
                   db: Session = Depends(get_db),
                   _=Depends(require_role(RoleEnum.ADMIN))):
    db.query(Cycle).update({"is_active": False})
    cycle = db.query(Cycle).filter(Cycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(404, "Cycle not found")
    cycle.is_active = True
    db.commit()
    return {"message": f"Cycle {cycle.year} activated"}

@router.post("/cycles")
def create_cycle(payload: dict,
                 db: Session = Depends(get_db),
                 _=Depends(require_role(RoleEnum.ADMIN))):
    year       = payload.get("year")
    phase      = payload.get("phase")
    start_date = payload.get("start_date")
    end_date   = payload.get("end_date")
    is_active  = bool(payload.get("is_active", False))

    if not all([year, phase, start_date, end_date]):
        raise HTTPException(400, "year, phase, start_date and end_date are required")

    if is_active:
        db.query(Cycle).update({"is_active": False})

    cycle = Cycle(
        year       = int(year),
        phase      = phase,
        start_date = datetime.fromisoformat(start_date),
        end_date   = datetime.fromisoformat(end_date),
        is_active  = is_active
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return cycle

@router.post("/cycles/{cycle_id}/open-quarter")
def open_quarter(cycle_id: str, payload: dict,
                 db: Session = Depends(get_db),
                 _=Depends(require_role(RoleEnum.ADMIN))):
    quarter = payload.get("quarter")
    if quarter not in ["Q1", "Q2", "Q3", "Q4", None]:
        raise HTTPException(400, "Quarter must be Q1, Q2, Q3, Q4, or null")
    cycle = db.query(Cycle).filter(Cycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(404, "Cycle not found")
    cycle.current_quarter = quarter
    db.commit()
    if quarter:
        return {"message": f"{quarter} check-in window is now OPEN"}
    return {"message": "All check-in windows are now CLOSED"}

# ── Users / Org ───────────────────────────────────────────────────
@router.get("/users")
def list_users(db: Session = Depends(get_db),
               _=Depends(require_role(RoleEnum.ADMIN))):
    users = db.query(User).order_by(User.role, User.name).all()
    return [{
        "id":         str(u.id),
        "name":       u.name,
        "email":      u.email,
        "role":       u.role.value,
        "department": u.department,
        "manager_id": str(u.manager_id) if u.manager_id else None,
        "manager_name": u.manager.name if u.manager else None
    } for u in users]

@router.put("/users/{user_id}/manager")
def update_manager(user_id: str, payload: dict,
                   db: Session = Depends(get_db),
                   _=Depends(require_role(RoleEnum.ADMIN))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    manager_id = payload.get("manager_id")
    if manager_id:
        manager = db.query(User).filter(User.id == manager_id).first()
        if not manager:
            raise HTTPException(404, "Manager not found")
        if str(manager.id) == str(user.id):
            raise HTTPException(400, "User cannot report to themselves")
    user.manager_id = manager_id or None
    db.commit()
    return {"message": "Reporting manager updated"}

# ── Goal oversight ────────────────────────────────────────────────
@router.get("/goals")
def list_goals(db: Session = Depends(get_db),
               _=Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
    if not cycle:
        raise HTTPException(404, "No active cycle")
    goals = db.query(Goal).filter(
        Goal.cycle_id == cycle.id
    ).order_by(Goal.created_at.desc()).all()
    return [{
        "id":         str(g.id),
        "title":      g.title,
        "owner":      g.owner.name if g.owner else "",
        "department": g.owner.department if g.owner else "",
        "thrustArea": g.thrust_area.name if g.thrust_area else "",
        "status":     g.status.value,
        "weightage":  g.weightage,
        "target":     g.target,
        "uomType":    g.uom_type.value,
        "isShared":   g.is_shared,
        "lockedAt":   g.locked_at.isoformat() if g.locked_at else None
    } for g in goals]