from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, goals, checkins, admin
from app.services.audit_logger import register_audit_listeners

# Create all tables on startup if they don't exist
# In production you'd use Alembic migrations instead
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AtomQuest Goal Portal",
    description="Goal Setting & Tracking Portal API",
    version="1.0.0"
    # Swagger UI available at /docs automatically
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api")
app.include_router(goals.router,    prefix="/api")
app.include_router(checkins.router, prefix="/api")
app.include_router(admin.router,    prefix="/api")

# Register automatic audit listeners (safe to call multiple times)
register_audit_listeners()

@app.get("/api/health")
def health():
    return {"status": "ok", "message": "AtomQuest FastAPI running"}
