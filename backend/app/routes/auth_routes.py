"""
Auth routes — login, current user, user management (admin).
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.services.audit_service import log_audit
from backend.app.utils.logger import get_logger
from database.db_connection import get_db
from database.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# ---------- Password hashing ----------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


# ---------- JWT ----------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


# ---------- Dependencies ----------

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> User:
    """Decode JWT and return the authenticated User, or raise 401."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.user_id == uuid.UUID(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Raise 403 if the current user is not an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ---------- Schemas ----------

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserOut(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    role: str
    hospital_name: str | None = None
    created_at: datetime
    last_login: datetime | None = None

    model_config = {"from_attributes": True}


class CreateUserRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str  # 'doctor' or 'admin'
    hospital_name: str | None = None


# ---------- Helper ----------

def _user_to_dict(user: User) -> dict:
    """Serialize user to dict, never including password_hash."""
    return {
        "user_id": str(user.user_id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "hospital_name": user.hospital_name,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


# ---------- Endpoints ----------

@router.post("/login", response_model=LoginResponse)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
):
    """Authenticate with email + password, return JWT."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last_login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Audit
    log_audit(db, user.user_id, "login", "users", user.user_id)
    db.commit()

    token = create_access_token(data={"sub": str(user.user_id)})
    logger.info("User %s logged in", user.email)

    return LoginResponse(
        access_token=token,
        user=_user_to_dict(user),
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    """Return the currently authenticated user."""
    return current_user


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: CreateUserRequest,
    admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """Create a new doctor or admin account (admin only)."""
    if body.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role must be 'doctor' or 'admin'",
        )

    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    new_user = User(
        full_name=body.full_name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        hospital_name=body.hospital_name,
    )
    db.add(new_user)
    db.flush()

    log_audit(db, admin.user_id, "created_user", "users", new_user.user_id)
    db.commit()
    db.refresh(new_user)

    logger.info("Admin %s created user %s", admin.email, new_user.email)
    return new_user


@router.get("/users", response_model=list[UserOut])
def list_users(
    admin: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    return db.query(User).order_by(User.created_at).all()
