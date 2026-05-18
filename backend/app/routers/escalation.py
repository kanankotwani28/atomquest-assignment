from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import uuid
from app.database import get_db
from app.models.models import (
    User, RoleEnum, Goal, GoalStatusEnum, CheckIn,
    Cycle, EscalationRule, EscalationLog,
    EscalationRuleTypeEnum, EscalationLevelEnum
)
from app.dependencies import require_role
from typing import List

router = APIRouter(prefix="/admin/escalation", tags=["Escalation"])

def get_quarter_start_date(year: int, quarter: str) -> datetime:
    if quarter == "Q1":
        return datetime(year, 7, 1)
    if quarter == "Q2":
        return datetime(year, 10, 1)
    if quarter == "Q3":
        return datetime(year, 1, 1)
    if quarter == "Q4":
        return datetime(year, 3, 1)
    return datetime(year, 5, 1)

# ── GET /rules — list all escalation rules
@router.get("/rules")
def get_escalation_rules(db: Session = Depends(get_db),
                         _=Depends(require_role(RoleEnum.ADMIN))):
    rules_db = db.query(EscalationRule).all()
    rules_map = {r.rule_type.value if hasattr(r.rule_type, "value") else str(r.rule_type): r for r in rules_db}
    
    defaults = [
        {"rule_type": "GOAL_NOT_SUBMITTED", "threshold_days": 7, "is_active": True},
        {"rule_type": "GOAL_NOT_APPROVED", "threshold_days": 5, "is_active": True},
        {"rule_type": "CHECKIN_MISSED", "threshold_days": 14, "is_active": True}
    ]
    
    result = []
    for d in defaults:
        t = d["rule_type"]
        if t in rules_map:
            r = rules_map[t]
            result.append({
                "id": str(r.id),
                "rule_type": t,
                "threshold_days": r.threshold_days,
                "is_active": r.is_active
            })
        else:
            result.append({
                "id": None,
                "rule_type": t,
                "threshold_days": d["threshold_days"],
                "is_active": d["is_active"]
            })
    return result

# ── POST /rules/seed — create default rules if they don't exist
@router.post("/rules/seed")
def seed_escalation_rules(db: Session = Depends(get_db),
                          _=Depends(require_role(RoleEnum.ADMIN))):
    defaults = [
        {"rule_type": EscalationRuleTypeEnum.GOAL_NOT_SUBMITTED, "threshold_days": 7, "is_active": True},
        {"rule_type": EscalationRuleTypeEnum.GOAL_NOT_APPROVED, "threshold_days": 5, "is_active": True},
        {"rule_type": EscalationRuleTypeEnum.CHECKIN_MISSED, "threshold_days": 14, "is_active": True}
    ]
    
    seeded_count = 0
    for d in defaults:
        existing = db.query(EscalationRule).filter(EscalationRule.rule_type == d["rule_type"]).first()
        if not existing:
            rule = EscalationRule(
                rule_type=d["rule_type"],
                threshold_days=d["threshold_days"],
                is_active=d["is_active"]
            )
            db.add(rule)
            seeded_count += 1
    db.commit()
    return {"message": f"Escalation rules seeded successfully. Added {seeded_count} new rule(s)."}

# ── PUT /rules/{rule_type} — update a rule
@router.put("/rules/{rule_type}")
def update_escalation_rule(rule_type: str,
                           payload: dict,
                           db: Session = Depends(get_db),
                           _=Depends(require_role(RoleEnum.ADMIN))):
    matched_enum = None
    for val in EscalationRuleTypeEnum:
        if val.value == rule_type:
            matched_enum = val
            break
    if not matched_enum:
        raise HTTPException(400, f"Invalid rule type: {rule_type}")

    threshold_days = payload.get("threshold_days")
    is_active = payload.get("is_active")

    if threshold_days is None:
        raise HTTPException(400, "threshold_days is required")

    try:
        t_days = int(threshold_days)
    except ValueError:
        raise HTTPException(400, "threshold_days must be an integer")

    if not (1 <= t_days <= 90):
        raise HTTPException(400, "threshold_days must be between 1 and 90")

    rule = db.query(EscalationRule).filter(EscalationRule.rule_type == matched_enum).first()
    if not rule:
        rule = EscalationRule(
            rule_type=matched_enum,
            threshold_days=t_days,
            is_active=bool(is_active)
        )
        db.add(rule)
    else:
        rule.threshold_days = t_days
        if is_active is not None:
            rule.is_active = bool(is_active)
    db.commit()
    db.refresh(rule)
    
    return {
        "id": str(rule.id),
        "rule_type": rule.rule_type.value,
        "threshold_days": rule.threshold_days,
        "is_active": rule.is_active
    }

# ── POST /run — run escalation check manually
@router.post("/run")
def run_escalation_check(db: Session = Depends(get_db),
                         _=Depends(require_role(RoleEnum.ADMIN))):
    cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
    if not cycle:
        raise HTTPException(404, "No active cycle found")

    rules_db = db.query(EscalationRule).filter(EscalationRule.is_active == True).all()
    rules_map = {r.rule_type: r for r in rules_db}

    escalations_created = 0
    escalations_by_type = {
        "GOAL_NOT_SUBMITTED": 0,
        "GOAL_NOT_APPROVED": 0,
        "CHECKIN_MISSED": 0
    }
    new_logs = []

    # Helper function to handle logs creations or dynamic level updates
    def process_log(employee_id, rule_type, threshold_days, notes):
        nonlocal escalations_created
        # Check if unresolved log already exists
        unresolved = db.query(EscalationLog).filter(
            EscalationLog.employee_id == employee_id,
            EscalationLog.rule_type == rule_type,
            EscalationLog.resolved_at == None
        ).order_by(EscalationLog.triggered_at.asc()).first()

        now = datetime.utcnow()
        if unresolved:
            # Escalate level based on days open
            days_open = (now - unresolved.triggered_at).days
            target_level = EscalationLevelEnum.EMPLOYEE
            if days_open > threshold_days * 3:
                target_level = EscalationLevelEnum.HR
            elif days_open > threshold_days * 2:
                target_level = EscalationLevelEnum.MANAGER

            if unresolved.level != target_level:
                unresolved.level = target_level
                db.commit()
            return

        # Prevent duplicate logs generated on the same calendar day
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        duplicate_today = db.query(EscalationLog).filter(
            EscalationLog.employee_id == employee_id,
            EscalationLog.rule_type == rule_type,
            EscalationLog.triggered_at >= today_start
        ).first()

        if duplicate_today:
            return

        # Create new log
        log = EscalationLog(
            employee_id=employee_id,
            rule_type=rule_type,
            level=EscalationLevelEnum.EMPLOYEE,
            notes=notes,
            triggered_at=now
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        
        escalations_created += 1
        escalations_by_type[rule_type.value] += 1
        new_logs.append({
            "id": str(log.id),
            "employee_name": log.employee.name,
            "rule_type": log.rule_type.value,
            "level": log.level.value,
            "triggered_at": log.triggered_at.isoformat()
        })

    # 1. RULE: GOAL_NOT_SUBMITTED
    rule_ns = rules_map.get(EscalationRuleTypeEnum.GOAL_NOT_SUBMITTED)
    if rule_ns:
        days_since_start = (datetime.utcnow() - cycle.start_date).days
        if days_since_start > rule_ns.threshold_days:
            employees = db.query(User).filter(User.role == RoleEnum.EMPLOYEE).all()
            for emp in employees:
                # Check if employee has any goal submitted or approved
                has_submitted = db.query(Goal).filter(
                    Goal.owner_id == emp.id,
                    Goal.cycle_id == cycle.id,
                    Goal.status.in_([GoalStatusEnum.SUBMITTED, GoalStatusEnum.APPROVED])
                ).first() is not None

                if not has_submitted:
                    process_log(
                        employee_id=emp.id,
                        rule_type=EscalationRuleTypeEnum.GOAL_NOT_SUBMITTED,
                        threshold_days=rule_ns.threshold_days,
                        notes=f"Goals not submitted within {rule_ns.threshold_days} days of cycle start ({days_since_start} days overdue)."
                    )

    # 2. RULE: GOAL_NOT_APPROVED
    rule_na = rules_map.get(EscalationRuleTypeEnum.GOAL_NOT_APPROVED)
    if rule_na:
        submitted_goals = db.query(Goal).filter(
            Goal.cycle_id == cycle.id,
            Goal.status == GoalStatusEnum.SUBMITTED
        ).all()
        for g in submitted_goals:
            days_since_submission = (datetime.utcnow() - g.updated_at).days
            if days_since_submission > rule_na.threshold_days:
                process_log(
                    employee_id=g.owner_id,
                    rule_type=EscalationRuleTypeEnum.GOAL_NOT_APPROVED,
                    threshold_days=rule_na.threshold_days,
                    notes=f"Manager has not approved goal '{g.title}' within {rule_na.threshold_days} days of submission ({days_since_submission} days overdue)."
                )

    # 3. RULE: CHECKIN_MISSED
    rule_cm = rules_map.get(EscalationRuleTypeEnum.CHECKIN_MISSED)
    if rule_cm and cycle.current_quarter:
        quarter = cycle.current_quarter
        days_since_quarter = abs((datetime.utcnow() - get_quarter_start_date(cycle.year, quarter)).days)
        if days_since_quarter > rule_cm.threshold_days:
            # Find employees with approved goals
            employees_with_approved = db.query(User).filter(User.role == RoleEnum.EMPLOYEE).all()
            for emp in employees_with_approved:
                has_approved_goals = db.query(Goal).filter(
                    Goal.owner_id == emp.id,
                    Goal.cycle_id == cycle.id,
                    Goal.status == GoalStatusEnum.APPROVED
                ).first() is not None

                if has_approved_goals:
                    # Check if check-in logged for current quarter
                    has_checkin = db.query(CheckIn).join(Goal).filter(
                        Goal.owner_id == emp.id,
                        Goal.cycle_id == cycle.id,
                        Goal.status == GoalStatusEnum.APPROVED,
                        CheckIn.quarter == quarter
                    ).first() is not None

                    if not has_checkin:
                        process_log(
                            employee_id=emp.id,
                            rule_type=EscalationRuleTypeEnum.CHECKIN_MISSED,
                            threshold_days=rule_cm.threshold_days,
                            notes=f"Check-in for {quarter} not logged within {rule_cm.threshold_days} days of window opening ({days_since_quarter} days overdue)."
                        )

    return {
        "checked_at": datetime.utcnow().isoformat(),
        "rules_run": len(rules_db),
        "escalations_created": escalations_created,
        "escalations_by_type": escalations_by_type,
        "details": new_logs
    }

# ── GET /logs — get all escalation logs
@router.get("/logs")
def get_escalation_logs(resolved: str = None,
                        rule_type: str = None,
                        db: Session = Depends(get_db),
                        _=Depends(require_role(RoleEnum.ADMIN))):
    query = db.query(EscalationLog).order_by(EscalationLog.triggered_at.desc())

    if resolved is not None:
        is_resolved = resolved.lower() == "true"
        if is_resolved:
            query = query.filter(EscalationLog.resolved_at != None)
        else:
            query = query.filter(EscalationLog.resolved_at == None)

    if rule_type:
        query = query.filter(EscalationLog.rule_type == rule_type)

    logs = query.all()
    return [{
        "id": str(l.id),
        "employee_id": str(l.employee_id),
        "employee_name": l.employee.name,
        "employee_email": l.employee.email,
        "rule_type": l.rule_type.value,
        "level": l.level.value,
        "triggered_at": l.triggered_at.isoformat() if l.triggered_at else None,
        "resolved_at": l.resolved_at.isoformat() if l.resolved_at else None,
        "notes": l.notes
    } for l in logs]

# ── POST /logs/{log_id}/resolve — mark an escalation as resolved
@router.post("/logs/{log_id}/resolve")
def resolve_escalation(log_id: str,
                       payload: dict,
                       db: Session = Depends(get_db),
                       _=Depends(require_role(RoleEnum.ADMIN))):
    log = db.query(EscalationLog).filter(EscalationLog.id == log_id).first()
    if not log:
        raise HTTPException(404, "Escalation log not found")
    
    notes = payload.get("notes")
    log.resolved_at = datetime.utcnow()
    if notes:
        log.notes = f"{log.notes or ''} | Resolved notes: {notes}".strip(" | ")
    
    db.commit()
    db.refresh(log)
    return {
        "id": str(log.id),
        "resolved_at": log.resolved_at.isoformat(),
        "notes": log.notes
    }

# ── GET /summary — dashboard summary
@router.get("/summary")
def get_escalation_summary(db: Session = Depends(get_db),
                           _=Depends(require_role(RoleEnum.ADMIN))):
    # unresolved escalations
    total_active = db.query(EscalationLog).filter(EscalationLog.resolved_at == None).count()

    # by type
    by_type = {}
    for r_type in EscalationRuleTypeEnum:
        by_type[r_type.value] = db.query(EscalationLog).filter(
            EscalationLog.resolved_at == None,
            EscalationLog.rule_type == r_type
        ).count()

    # by level
    by_level = {}
    for lvl in EscalationLevelEnum:
        by_level[lvl.value] = db.query(EscalationLog).filter(
            EscalationLog.resolved_at == None,
            EscalationLog.level == lvl
        ).count()

    # resolved this week
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    resolved_this_week = db.query(EscalationLog).filter(
        EscalationLog.resolved_at >= one_week_ago
    ).count()

    # employees affected (distinct employees with active escalations)
    employees_affected = db.query(EscalationLog.employee_id).filter(
        EscalationLog.resolved_at == None
    ).distinct().count()

    return {
        "total_active": total_active,
        "by_type": by_type,
        "by_level": by_level,
        "resolved_this_week": resolved_this_week,
        "employees_affected": employees_affected
    }
