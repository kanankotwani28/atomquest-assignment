import uuid
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

# ── Analytics ─────────────────────────────────────────────────────
@router.get("/analytics")
def get_admin_analytics(db: Session = Depends(get_db),
                         _=Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
    if not cycle:
        return {
            "summary": {
                "avg_overall_score": None,
                "total_employees": 0,
                "total_goals": 0,
                "checkin_completion_rate": 0.0
            },
            "employee_scores": [],
            "thrust_area_distribution": [],
            "uom_distribution": [],
            "manager_effectiveness": [],
            "heatmap": [],
            "goal_status_distribution": []
        }

    employees = db.query(User).filter(User.role == RoleEnum.EMPLOYEE).all()

    emp_ids = [e.id for e in employees]
    goals = (db.query(Goal)
             .filter(Goal.cycle_id == cycle.id, Goal.owner_id.in_(emp_ids))
             .all())

    goals_by_owner = {}
    for g in goals:
        goals_by_owner.setdefault(g.owner_id, []).append(g)

    employee_scores_list = []
    heatmap_list = []

    for emp in employees:
        emp_goals = goals_by_owner.get(emp.id, [])
        approved_goals = [g for g in emp_goals if g.status == GoalStatusEnum.APPROVED]

        q_sums = {"Q1": 0.0, "Q2": 0.0, "Q3": 0.0, "Q4": 0.0}
        q_weights = {"Q1": 0.0, "Q2": 0.0, "Q3": 0.0, "Q4": 0.0}
        latest_score_sum = 0.0
        latest_weight_sum = 0.0

        for g in approved_goals:
            g_checkins = {ci.quarter: ci for ci in g.check_ins if ci.score is not None}
            for q in ["Q1", "Q2", "Q3", "Q4"]:
                if q in g_checkins:
                    q_sums[q] += g_checkins[q].score * g.weightage
                    q_weights[q] += g.weightage
            latest_q = None
            for q in ["Q4", "Q3", "Q2", "Q1"]:
                if q in g_checkins:
                    latest_q = q
                    break
            if latest_q:
                latest_score_sum += g_checkins[latest_q].score * g.weightage
                latest_weight_sum += g.weightage

        q_score = {}
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            q_score[q] = round(q_sums[q] / q_weights[q], 1) if q_weights[q] > 0 else None

        overall = round(latest_score_sum / latest_weight_sum, 1) if latest_weight_sum > 0 else None

        employee_scores_list.append({
            "employee": emp.name, "department": emp.department or "General",
            "q1_score": q_score["Q1"], "q2_score": q_score["Q2"],
            "q3_score": q_score["Q3"], "q4_score": q_score["Q4"], "overall": overall
        })

        heatmap_list.append({
            "employee": emp.name, "department": emp.department or "General",
            "q1": q_score["Q1"], "q2": q_score["Q2"],
            "q3": q_score["Q3"], "q4": q_score["Q4"], "overall": overall
        })

    # Summary calculations
    overall_scores_list = [item["overall"] for item in employee_scores_list if item["overall"] is not None]
    avg_overall_score = round(sum(overall_scores_list) / len(overall_scores_list), 1) if overall_scores_list else None

    total_employees = len(employees)
    total_goals = len(goals)

    goal_ids_with_checkin = set(
        row[0] for row in
        db.query(CheckIn.goal_id).join(Goal).filter(Goal.cycle_id == cycle.id).distinct().all()
    )
    employees_with_checkin = 0
    for emp in employees:
        emp_goal_ids = [g.id for g in goals_by_owner.get(emp.id, [])]
        if any(gid in goal_ids_with_checkin for gid in emp_goal_ids):
            employees_with_checkin += 1

    checkin_completion_rate = round((employees_with_checkin / total_employees) * 100, 1) if total_employees > 0 else 0.0

    # Thrust area distribution
    thrust_areas = db.query(ThrustArea).all()
    thrust_dist = []
    for ta in thrust_areas:
        ta_goals = db.query(Goal).filter(
            Goal.thrust_area_id == ta.id,
            Goal.cycle_id == cycle.id
        ).all()
        
        goal_count = len(ta_goals)
        ta_checkins = []
        for g in ta_goals:
            for ci in g.check_ins:
                if ci.score is not None:
                    ta_checkins.append(ci.score)

        avg_score = round(sum(ta_checkins) / len(ta_checkins), 1) if ta_checkins else None
        thrust_dist.append({
            "name": ta.name,
            "count": goal_count,
            "avg_score": avg_score
        })

    # UoM distribution
    uom_counts = {"NUMERIC_MIN": 0, "NUMERIC_MAX": 0, "TIMELINE": 0, "ZERO": 0}
    for g in goals:
        val = g.uom_type.value if hasattr(g.uom_type, 'value') else str(g.uom_type)
        if val in uom_counts:
            uom_counts[val] += 1
    uom_dist = [{"uom_type": k, "count": v} for k, v in uom_counts.items()]

    # Manager effectiveness
    managers = db.query(User).filter(User.role == RoleEnum.MANAGER).all()
    mgr_eff = []
    emp_overall_map = {item["employee"]: item["overall"] for item in employee_scores_list}

    for mgr in managers:
        reports = db.query(User).filter(
            User.role == RoleEnum.EMPLOYEE,
            User.manager_id == mgr.id
        ).all()
        team_size = len(reports)
        if team_size == 0:
            continue

        reports_with_checkin = 0
        report_overall_scores = []

        for rep in reports:
            has_checkin = db.query(CheckIn).join(Goal).filter(
                Goal.owner_id == rep.id,
                Goal.cycle_id == cycle.id
            ).first() is not None
            if has_checkin:
                reports_with_checkin += 1
            
            overall = emp_overall_map.get(rep.name)
            if overall is not None:
                report_overall_scores.append(overall)

        checkin_rate = round((reports_with_checkin / team_size) * 100, 1) if team_size > 0 else 0.0
        avg_team_score = round(sum(report_overall_scores) / len(report_overall_scores), 1) if report_overall_scores else None

        mgr_eff.append({
            "manager": mgr.name,
            "team_size": team_size,
            "checkin_completion_rate": checkin_rate,
            "avg_team_score": avg_team_score
        })

    # Goal distribution by status per department
    dept_status = {}
    for g in goals:
        dept = g.owner.department or "General"
        status = g.status.value if hasattr(g.status, 'value') else str(g.status)
        if dept not in dept_status:
            dept_status[dept] = {"DRAFT": 0, "SUBMITTED": 0, "APPROVED": 0, "RETURNED": 0}
        
        if status == "REVISION_REQUIRED":
            status = "DRAFT"
        if status in dept_status[dept]:
            dept_status[dept][status] += 1

    goal_status_dist = []
    for dept, counts in dept_status.items():
        goal_status_dist.append({
            "department": dept,
            "DRAFT": counts["DRAFT"],
            "SUBMITTED": counts["SUBMITTED"],
            "APPROVED": counts["APPROVED"],
            "RETURNED": counts["RETURNED"],
            "total": sum(counts.values())
        })

    return {
        "summary": {
            "avg_overall_score": avg_overall_score,
            "total_employees": total_employees,
            "total_goals": total_goals,
            "checkin_completion_rate": checkin_completion_rate
        },
        "employee_scores": employee_scores_list,
        "thrust_area_distribution": thrust_dist,
        "uom_distribution": uom_dist,
        "manager_effectiveness": mgr_eff,
        "heatmap": heatmap_list,
        "goal_status_distribution": goal_status_dist
    }

# ── Audit trail ───────────────────────────────────────────────────
@router.get("/audit-logs")
def get_audit_logs(page: int = 1, page_size: int = 50,
                   db: Session = Depends(get_db),
                   _=Depends(require_role(RoleEnum.ADMIN))):
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    offset = (page - 1) * page_size

    total = db.query(func.count(AuditLog.id)).scalar() or 0

    logs = db.query(AuditLog).order_by(
        AuditLog.created_at.desc()
    ).offset(offset).limit(page_size).all()
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

    return {"items": result, "total": total, "page": page, "page_size": page_size, "pages": (total + page_size - 1) // page_size}

# ── Unlock a goal ─────────────────────────────────────────────────
@router.post("/goals/{goal_id}/unlock")
def unlock_goal(goal_id: str,
                db: Session = Depends(get_db),
                current_user: User = Depends(require_role(RoleEnum.ADMIN))):
    try:
        goal_uuid = uuid.UUID(goal_id)
    except ValueError:
        raise HTTPException(400, "Invalid goal ID format")

    goal = db.query(Goal).filter(Goal.id == goal_uuid).first()
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
        try:
            emp_uuid = uuid.UUID(str(emp_id))
        except ValueError:
            blocked.append({
                "employee_id": str(emp_id),
                "reason": "Invalid employee ID format"
            })
            continue

        emp = db.query(User).filter(User.id == emp_uuid).first()
        if not emp:
            blocked.append({
                "employee_id": str(emp_id),
                "reason": "Employee not found"
            })
            continue

        total_all = db.query(func.sum(Goal.weightage)).filter(
            Goal.owner_id == emp_uuid,
            Goal.cycle_id == cycle.id
        ).scalar() or 0

        total_approved = db.query(func.sum(Goal.weightage)).filter(
            Goal.owner_id == emp_uuid,
            Goal.cycle_id == cycle.id,
            Goal.status == GoalStatusEnum.APPROVED
        ).scalar() or 0

        if total_all + body.weightage > 100:
            available = 100 - total_all
            over_by = round((total_all + body.weightage) - 100, 1)
            blocked.append({
                "employee_id": str(emp_id),
                "employee_name": emp.name,
                "current_total": total_all,
                "approved_total": total_approved,
                "shared_weightage": body.weightage,
                "would_be": round(total_all + body.weightage, 1),
                "available": available,
                "over_by": over_by,
                "reason": f"Total {total_all}% + {body.weightage}% = {round(total_all + body.weightage, 1)}% (exceeds 100% by {over_by}%). Only {available}% available."
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

    writer.writerow(["Employee", "Department", "Goal Title", "Thrust Area",
                     "UoM Type", "Target", "Weightage %",
                     "Q1 Actual", "Q1 Score %", "Q1 Status",
                     "Q2 Actual", "Q2 Score %", "Q2 Status",
                     "Q3 Actual", "Q3 Score %", "Q3 Status",
                     "Q4 Actual", "Q4 Score %", "Q4 Status"])

    PROGRESS_LABELS = {
        "NOT_STARTED": "Not Started",
        "ON_TRACK":    "On Track",
        "COMPLETED":   "Completed",
    }

    for emp in db.query(User).filter(User.role == RoleEnum.EMPLOYEE).all():
        for g in db.query(Goal).filter(
            Goal.owner_id == emp.id, Goal.cycle_id == cycle.id
        ).all():
            ci_map = {ci.quarter: ci for ci in g.check_ins}
            row = [
                emp.name,
                emp.department or "",
                g.title,
                g.thrust_area.name if g.thrust_area else "",
                g.uom_type.value.replace("_", " ").title() if hasattr(g.uom_type, "value") else str(g.uom_type),
                g.target,
                g.weightage,
            ]
            for q in ["Q1", "Q2", "Q3", "Q4"]:
                ci = ci_map.get(q)
                row.extend([
                    ci.actual if ci and ci.actual is not None else "",
                    f"{ci.score:.1f}" if ci and ci.score is not None else "",
                    PROGRESS_LABELS.get(ci.progress_status.value if hasattr(ci.progress_status, "value") else str(ci.progress_status), "") if ci else "",
                ])
            writer.writerow(row)

    output.seek(0)
    content = "\ufeff" + output.getvalue()
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8-sig")),
        media_type="text/csv; charset=utf-8-sig",
        headers={
            "Content-Disposition": "attachment; filename=atomquest_achievement_report.csv",
            "Cache-Control": "no-cache",
        }
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
    cycle.checkin_window_open = quarter is not None
    db.commit()
    if quarter:
        return {"message": f"{quarter} check-in window is now OPEN", "checkin_window_open": True}
    return {"message": "All check-in windows are now CLOSED", "checkin_window_open": False}

@router.post("/cycles/{cycle_id}/toggle-window")
def toggle_checkin_window(cycle_id: str,
                           db: Session = Depends(get_db),
                           _=Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(404, "Cycle not found")
    cycle.checkin_window_open = not cycle.checkin_window_open
    db.commit()
    status = "OPEN" if cycle.checkin_window_open else "CLOSED"
    return {"message": f"Check-in window is now {status}", "checkin_window_open": cycle.checkin_window_open}

BRD_WINDOW_MAP = {
    "Q1": {"month": 7, "day": 1, "label": "Q1 (July)"},
    "Q2": {"month": 10, "day": 1, "label": "Q2 (October)"},
    "Q3": {"month": 1, "day": 1, "label": "Q3 (January)"},
    "Q4": {"month": 3, "day": 1, "label": "Q4 (March/April)"},
}

@router.post("/cycles/{cycle_id}/auto-schedule")
def auto_schedule_windows(cycle_id: str,
                           db: Session = Depends(get_db),
                           _=Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(404, "Cycle not found")

    cycle_year = cycle.year
    windows = {}
    for q, cfg in BRD_WINDOW_MAP.items():
        m = cfg["month"]
        y = cycle_year if m >= 5 else cycle_year + 1
        windows[q] = datetime(y, m, cfg["day"])

    cycle.current_quarter = "Q1"
    cycle.checkin_window_open = True
    db.commit()
    db.refresh(cycle)

    return {
        "message": "Cycle auto-scheduled per BRD check-in windows",
        "current_quarter": "Q1",
        "checkin_window_open": True,
        "windows": {
            "Q1": {"opens": "1st July", "closes": "30th September"},
            "Q2": {"opens": "1st October", "closes": "31st December"},
            "Q3": {"opens": "1st January", "closes": "28th February"},
            "Q4": {"opens": "1st March", "closes": "30th April"},
        }
    }

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
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(400, "Invalid user ID format")

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(404, "User not found")
    manager_id = payload.get("manager_id")
    if manager_id:
        try:
            manager_uuid = uuid.UUID(manager_id)
        except ValueError:
            raise HTTPException(400, "Invalid manager ID format")
        manager = db.query(User).filter(User.id == manager_uuid).first()
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