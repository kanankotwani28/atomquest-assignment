from datetime import datetime, timedelta
from jose import jwt
import bcrypt
from app.config import settings

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)

