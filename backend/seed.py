from app.database import SessionLocal, engine, Base
from app.models.models import User, ThrustArea, Cycle, RoleEnum
from app.services.auth_service import hash_password
from datetime import datetime

# Create all tables if they don't exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed():
    # Users
    if not db.query(User).filter(User.email == "admin@atomquest.com").first():
        admin = User(name="Admin User", email="admin@atomquest.com",
                     password=hash_password("password123"), role=RoleEnum.ADMIN,
                     department="HR")
        db.add(admin)

    if not db.query(User).filter(User.email == "manager@atomquest.com").first():
        manager = User(name="Priya Sharma", email="manager@atomquest.com",
                       password=hash_password("password123"), role=RoleEnum.MANAGER,
                       department="Sales")
        db.add(manager)
        db.flush()  # flush to get manager.id before creating employee

    manager = db.query(User).filter(User.email == "manager@atomquest.com").first()

    if not db.query(User).filter(User.email == "employee@atomquest.com").first():
        employee = User(name="Rahul Verma", email="employee@atomquest.com",
                        password=hash_password("password123"), role=RoleEnum.EMPLOYEE,
                        department="Sales", manager_id=manager.id)
        db.add(employee)

    # Thrust areas
    for name in ["Revenue Growth", "Cost Optimisation",
                 "Customer Satisfaction", "Safety", "People Development"]:
        if not db.query(ThrustArea).filter(ThrustArea.name == name).first():
            db.add(ThrustArea(name=name))

    # Active cycle
    if not db.query(Cycle).filter(Cycle.year == 2025).first():
        db.add(Cycle(year=2025, phase="Goal Setting",
                     start_date=datetime(2025, 5, 1),
                     end_date=datetime(2026, 4, 30),
                     is_active=True))

    db.commit()
    print("Seed complete — admin / manager / employee all use password: password123")

if __name__ == "__main__":
    seed()
    db.close()