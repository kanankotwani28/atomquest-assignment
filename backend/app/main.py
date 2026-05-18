from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import Base, engine, SessionLocal
from app.routers import auth, goals, checkins, admin, escalation
from app.services.audit_logger import register_audit_listeners

Base.metadata.create_all(bind=engine)

from app.models.models import EscalationRule, EscalationLog

def run_pending_migrations():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='cycles' AND column_name='checkin_window_open'"))
        if not result.fetchone():
            db.execute(text("ALTER TABLE cycles ADD COLUMN checkin_window_open BOOLEAN DEFAULT FALSE"))
            db.commit()
            print("Migration: added checkin_window_open column to cycles table")
    except Exception as e:
        print(f"Migration check failed: {e}")
        db.rollback()
    finally:
        db.close()

run_pending_migrations()

app = FastAPI(
    title="AtomQuest Goal Portal",
    description="Goal Setting & Tracking Portal API",
    version="1.0.0"
    # Swagger UI available at /docs automatically
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://atomquest-assignment.vercel.app/"],  # Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api")
app.include_router(goals.router,    prefix="/api")
app.include_router(checkins.router, prefix="/api")
app.include_router(admin.router,    prefix="/api")
app.include_router(escalation.router, prefix="/api")

# Register automatic audit listeners (safe to call multiple times)
register_audit_listeners()

# Start escalation scheduler (runs every 30 minutes)
try:
    from app.services.escalation_scheduler import start_escalation_scheduler
    start_escalation_scheduler()
except Exception as e:
    print(f"Failed to start escalation scheduler: {e}")

@app.get("/api/health")
def health():
    return {"status": "ok", "message": "AtomQuest FastAPI running"}
