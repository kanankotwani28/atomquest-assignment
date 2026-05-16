from sqlalchemy.orm import Session
from app.models.models import AuditLog
import uuid

def log_change(db: Session, goal_id: uuid.UUID, changed_by_id: uuid.UUID,
               field: str, old_value=None, new_value=None, reason: str = None):
    try:
        entry = AuditLog(
            goal_id=goal_id,
            changed_by_id=changed_by_id,
            field=field,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
            reason=reason
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Audit log failed: {e}")  # never crash the main operation