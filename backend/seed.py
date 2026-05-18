from app.database import SessionLocal, engine, Base
from app.models.models import User, ThrustArea, Cycle, RoleEnum
from app.services.auth_service import hash_password
from datetime import datetime

Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed():
    # ── Admin ──────────────────────────────────────────────────────
    admin = db.query(User).filter(User.email == "admin@atomquest.com").first()
    if not admin:
        admin = User(name="Admin User", email="admin@atomquest.com",
                     password=hash_password("password123"), role=RoleEnum.ADMIN, department="HR")
        db.add(admin)
        db.flush()
    else:
        admin.password = hash_password("password123")
        db.flush()

    # ── Manager ────────────────────────────────────────────────────
    manager = db.query(User).filter(User.email == "manager@atomquest.com").first()
    if not manager:
        manager = User(name="Priya Sharma", email="manager@atomquest.com",
                       password=hash_password("password123"), role=RoleEnum.MANAGER, department="Sales")
        db.add(manager)
        db.flush()
    else:
        manager.password = hash_password("password123")
        db.flush()

    manager = db.query(User).filter(User.email == "manager@atomquest.com").first()

    # ── Employees (both under Priya) ──────────────────────────────
    employees = [
        ("Rahul Verma",  "employee@atomquest.com",  "Sales"),
        ("Meera Patel",  "meera@atomquest.com",      "Sales"),
    ]
    for name, email, dept in employees:
        emp = db.query(User).filter(User.email == email).first()
        if not emp:
            db.add(User(name=name, email=email, password=hash_password("password123"),
                       role=RoleEnum.EMPLOYEE, department=dept, manager_id=manager.id))
        else:
            emp.password = hash_password("password123")
            db.flush()

    # ── Thrust Areas ───────────────────────────────────────────────
    for name in ["Revenue Growth", "Cost Optimisation",
                 "Customer Satisfaction", "Safety", "People Development"]:
        if not db.query(ThrustArea).filter(ThrustArea.name == name).first():
            db.add(ThrustArea(name=name))

    # ── Active Cycle ───────────────────────────────────────────────
    if not db.query(Cycle).filter(Cycle.year == 2025).first():
        db.add(Cycle(year=2025, phase="Goal Setting",
                     start_date=datetime(2025, 5, 1),
                     end_date=datetime(2026, 4, 30),
                     is_active=True, checkin_window_open=True))

    db.commit()
    print("Seed complete — password: password123")
    print("Admin:  admin@atomquest.com")
    print("Manager: manager@atomquest.com / priya@atomquest.com")
    print("Employees: employee@atomquest.com (Rahul Verma), meera@atomquest.com (Meera Patel)")

if __name__ == "__main__":
    seed()
    db.close()