from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings


# Why check_same_thread=False is NOT needed for PostgreSQL — that's SQLite only
engine = create_engine(settings.database_url)

# SessionLocal: factory that creates new DB sessions
# autocommit=False: we control when to commit (good for transactions)
# autoflush=False: don't auto-write to DB until we explicitly commit
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base: all SQLAlchemy models inherit from this
Base = declarative_base()

# Dependency injected into every route that needs DB access
def get_db():
    db = SessionLocal()
    try:
        yield db          # give the session to the route handler
    finally:
        db.close()        # always close — even if an exception occurs