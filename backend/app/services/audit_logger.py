from sqlalchemy.orm import Session
from app.models.models import AuditLog
import uuid
from sqlalchemy import event, inspect
from app.models.models import Goal
from app.database import SessionLocal
import threading

# Special system UUID used when the actor is not available (automatic audits)
SYSTEM_USER_ID = uuid.UUID(int=0)

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


def _goal_before_update(mapper, connection, target):
    """SQLAlchemy listener: automatically log changes to Goal fields when
    the goal was previously locked (post-lock changes). Uses a system actor
    when a user id is not available."""
    try:
        state = inspect(target)
        # Determine if the goal was locked before this update
        locked_hist = state.attrs.locked_at.history
        was_locked_before = bool(locked_hist.deleted) or (locked_hist.added == [] and target.locked_at is not None)
        if not was_locked_before:
            return

        changed_fields = []
        for attr in ['title', 'description', 'target', 'weightage', 'thrust_area_id', 'uom_type', 'status', 'is_shared', 'locked_at']:
            hist = getattr(state.attrs, attr).history
            if hist.has_changes():
                old = hist.deleted[0] if hist.deleted else None
                new = hist.added[0] if hist.added else None
                changed_fields.append((attr, old, new))

        if not changed_fields:
            return

        # Use a fresh session to record audit entries
        db = SessionLocal()
        try:
            for attr, old, new in changed_fields:
                log_change(db, target.id, SYSTEM_USER_ID, attr, old, new, reason="Automatic post-lock audit")
        finally:
            db.close()
    except Exception as e:
        # Never crash the request cycle for audit failures
        print(f"Automatic audit listener error: {e}")


def register_audit_listeners():
    # Guard against multiple registrations in development hot-reload
    try:
        event.listen(Goal, 'before_update', _goal_before_update)
    except Exception:
        pass