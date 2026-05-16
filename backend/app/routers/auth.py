from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserOut
from app.services.auth_service import verify_password, create_token
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()

    # Same message for wrong email and wrong password — prevents user enumeration
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({
        "id":         str(user.id),
        "email":      user.email,
        "name":       user.name,
        "role":       user.role.value,
        "department": user.department,
        "manager_id": str(user.manager_id) if user.manager_id else None
    })

    return {"token": token, "user": user}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user