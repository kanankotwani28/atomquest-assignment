import time
import threading
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.models import (
    User, Goal, CheckIn, Cycle, GoalStatusEnum,
    EscalationRule, EscalationLog, EscalationRuleTypeEnum, EscalationLevelEnum
)


def check_and_create_escalations():
    """
    Background job: scans all active escalation rules and creates
    escalation logs for employees who violate them.
    Safe to run repeatedly — only creates new logs if condition persists.
    """
    db = SessionLocal()
    try:
        rules = db.query(EscalationRule).filter(EscalationRule.is_active == True).all()
        if not rules:
            return

        cycle = db.query(Cycle).filter(Cycle.is_active == True).first()
        if not cycle:
            return

        employees = db.query(User).filter(User.role == "EMPLOYEE").all()

        for rule in rules:
            for emp in employees:
                triggered = False
                message = ""
                threshold = rule.threshold_days or 7

                if rule.rule_type == EscalationRuleTypeEnum.GOAL_NOT_SUBMITTED:
                    days_open = (datetime.utcnow() - cycle.start_date).days
                    if days_open > threshold:
                        emp_goals = db.query(Goal).filter(
                            Goal.owner_id == emp.id,
                            Goal.cycle_id == cycle.id
                        ).all()
                        if not any(g.status == GoalStatusEnum.SUBMITTED for g in emp_goals):
                            triggered = True
                            message = f"No goals submitted by {emp.name} within {days_open} days of cycle start"

                elif rule.rule_type == EscalationRuleTypeEnum.GOAL_NOT_APPROVED:
                    submitted_goals = db.query(Goal).filter(
                        Goal.owner_id == emp.id,
                        Goal.cycle_id == cycle.id,
                        Goal.status == GoalStatusEnum.SUBMITTED
                    ).all()
                    for g in submitted_goals:
                        days_pending = (datetime.utcnow() - g.created_at).days
                        if days_pending > threshold:
                            triggered = True
                            message = f"Goal '{g.title}' pending approval for {days_pending} days"

                elif rule.rule_type == EscalationRuleTypeEnum.CHECKIN_MISSED:
                    emp_goals = db.query(Goal).filter(
                        Goal.owner_id == emp.id,
                        Goal.cycle_id == cycle.id,
                        Goal.status == GoalStatusEnum.APPROVED
                    ).all()
                    for g in emp_goals:
                        completed_quarters = [ci.quarter for ci in g.check_ins if ci.score is not None]
                        for q in ["Q1", "Q2", "Q3", "Q4"]:
                            if q not in completed_quarters:
                                triggered = True
                                message = f"No check-in completed for goal '{g.title}' ({q})"
                                break

                if triggered:
                    existing = db.query(EscalationLog).filter(
                        EscalationLog.employee_id == emp.id,
                        EscalationLog.rule_type == rule.rule_type,
                        EscalationLog.resolved_at.is_(None)
                    ).first()
                    if not existing:
                        log = EscalationLog(
                            employee_id=emp.id,
                            rule_type=rule.rule_type,
                            level=EscalationLevelEnum.EMPLOYEE,
                            notes=message,
                        )
                        db.add(log)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Escalation check failed: {e}")
    finally:
        db.close()


def start_escalation_scheduler():
    """Run escalation check every 30 minutes in a background thread."""
    def run():
        while True:
            check_and_create_escalations()
            time.sleep(1800)

    t = threading.Thread(target=run, daemon=True)
    t.start()
    print("Escalation scheduler started — running every 30 minutes")


def trigger_escalation_now():
    """Manually trigger escalation check (for admin button)."""
    check_and_create_escalations()