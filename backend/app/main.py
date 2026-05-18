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

# Auto-seed database on startup to guarantee demo accounts exist
try:
    import sys
    import os
    # Ensure backend directory is in path
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.append(backend_dir)
    from seed import seed
    seed()
    print("Auto-seeding: demo accounts verified and seeded successfully")
except Exception as e:
    print(f"Auto-seeding skipped/failed on startup: {e}")


app = FastAPI(
    title="AtomQuest Goal Portal",
    description="Goal Setting & Tracking Portal API",
    version="1.0.0"
    # Swagger UI available at /docs automatically
)

import os

# Dynamic CORS origins configuration from environment
allowed_origins_env = os.getenv("CORS_ORIGINS")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://atomquest-assignment.vercel.app",
        "https://atomquest-assignment-7q1s.vercel.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
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

@app.get("/api/debug-users")
def debug_users():
    db = SessionLocal()
    try:
        from app.models.models import User
        users = db.query(User).all()
        user_list = [{"id": str(u.id), "email": u.email, "role": u.role.value if u.role else None} for u in users]
        
        # If empty, force-seed right now
        seeded = False
        if not users:
            from seed import seed
            seed()
            seeded = True
            users = db.query(User).all()
            user_list = [{"id": str(u.id), "email": u.email, "role": u.role.value if u.role else None} for u in users]
            
        return {
            "user_count": len(users),
            "users": user_list,
            "force_seeded": seeded,
            "message": "Database is populated" if user_list else "Database is empty"
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

