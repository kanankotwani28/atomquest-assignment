# test_db.py
from sqlalchemy import create_engine

DATABASE_URL = "postgresql://postgres:Kanandatabase@localhost:5432/atomquest"

try:
    engine = create_engine(DATABASE_URL)
    conn = engine.connect()
    print("Database connected successfully!")
    conn.close()
    print("Connection closed.")
except Exception as e:
    print(f"Database connection failed: {e}")