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
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.services.audit_service import log_audit
from backend.app.services.email_service import EmailDeliveryError, email_delivery_configured
from backend.app.services.otp_service import (
    EMAIL_VERIFICATION,
    PASSWORD_CHANGE,
    PASSWORD_RESET,
    consume_otp,
    issue_otp,
)
from backend.app.utils.logger import get_logger
from database.db_connection import get_db
from database.models.email_otp_challenge import EmailOtpChallenge
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
    if user is None or payload.get("ver", 0) != user.token_version:
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
    email_verified: bool = True
    created_at: datetime
    last_login: datetime | None = None

    model_config = {"from_attributes": True}


class CreateUserRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: str  # 'doctor' or 'admin'
    hospital_name: str | None = None


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    hospital_name: str | None = Field(default=None, max_length=150)


class EmailRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(EmailRequest):
    otp: str = Field(pattern=r"^\d{6}$")


class ResetPasswordRequest(VerifyEmailRequest):
    new_password: str = Field(min_length=8, max_length=72)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)
    otp: str = Field(pattern=r"^\d{6}$")


class MessageResponse(BaseModel):
    message: str
    email: str | None = None


# ---------- Helper ----------

def _user_to_dict(user: User) -> dict:
    """Serialize user to dict, never including password_hash."""
    return {
        "user_id": str(user.user_id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "hospital_name": user.hospital_name,
        "email_verified": user.email_verified,
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
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Verify your email before signing in")

    # Update last_login and write audit log in one transaction
    user.last_login = datetime.now(timezone.utc)
    log_audit(db, user.user_id, "login", "users", user.user_id)
    db.commit()

    token = create_access_token(data={"sub": str(user.user_id), "ver": user.token_version})
    logger.info("User %s logged in", user.email)

    return LoginResponse(
        access_token=token,
        user=_user_to_dict(user),
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    """Return the currently authenticated user."""
    return current_user


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a pending doctor account and send an email verification code."""
    if not email_delivery_configured():
        raise HTTPException(status_code=503, detail="Email verification is not configured")

    email = str(body.email).lower()
    user = db.query(User).filter(User.email == email).first()
    if user and user.email_verified:
        raise HTTPException(status_code=409, detail="Email already registered")
    try:
        if user is None:
            user = User(
                full_name=body.full_name.strip(), email=email,
                password_hash=hash_password(body.password), role="doctor",
                hospital_name=body.hospital_name, email_verified=False,
            )
            db.add(user)
            db.flush()
            log_audit(db, user.user_id, "registered_account", "users", user.user_id)
        issue_otp(db, user, EMAIL_VERIFICATION)
        db.commit()
    except EmailDeliveryError as exc:
        db.rollback()
        logger.exception("Email verification delivery failed")
        raise HTTPException(status_code=503, detail="Could not send verification email") from exc
    return MessageResponse(
        message="If this address can be registered, a verification code has been sent.", email=email
    )


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(body.email).lower()).first()
    valid = bool(user and not user.email_verified and consume_otp(db, user, EMAIL_VERIFICATION, body.otp))
    if valid and user:
        user.email_verified = True
        log_audit(db, user.user_id, "verified_email", "users", user.user_id)
    db.commit()
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    return MessageResponse(message="Email verified. You can now sign in.", email=user.email)


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(body: EmailRequest, db: Session = Depends(get_db)):
    if not email_delivery_configured():
        raise HTTPException(status_code=503, detail="Email delivery is not configured")
    email = str(body.email).lower()
    user = db.query(User).filter(User.email == email, User.email_verified.is_(False)).first()
    if user:
        try:
            issue_otp(db, user, EMAIL_VERIFICATION)
            db.commit()
        except EmailDeliveryError:
            db.rollback()
            logger.exception("Verification resend delivery failed")
    return MessageResponse(message="If the account needs verification, a code has been sent.")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(body: EmailRequest, db: Session = Depends(get_db)):
    if not email_delivery_configured():
        raise HTTPException(status_code=503, detail="Email delivery is not configured")
    user = db.query(User).filter(
        User.email == str(body.email).lower(), User.email_verified.is_(True)
    ).first()
    if user:
        try:
            sent = issue_otp(db, user, PASSWORD_RESET)
            if sent:
                log_audit(db, user.user_id, "password_reset_requested", "users", user.user_id)
            db.commit()
        except EmailDeliveryError:
            db.rollback()
            logger.exception("Password reset delivery failed")
    return MessageResponse(message="If an account exists for this email, a password reset code has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == str(body.email).lower(), User.email_verified.is_(True)
    ).first()
    valid = bool(user and consume_otp(db, user, PASSWORD_RESET, body.otp))
    if valid and user:
        user.password_hash = hash_password(body.new_password)
        user.token_version += 1
        db.query(EmailOtpChallenge).filter(
            EmailOtpChallenge.user_id == user.user_id,
            EmailOtpChallenge.consumed_at.is_(None),
        ).update({EmailOtpChallenge.consumed_at: datetime.now(timezone.utc)}, synchronize_session=False)
        log_audit(db, user.user_id, "password_reset_completed", "users", user.user_id)
    db.commit()
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    return MessageResponse(message="Password updated. You can now sign in.")


@router.put("/password", response_model=MessageResponse)
def change_password(
    body: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if not consume_otp(db, current_user, PASSWORD_CHANGE, body.otp):
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired password change code")
    current_user.password_hash = hash_password(body.new_password)
    current_user.token_version += 1
    log_audit(db, current_user.user_id, "password_changed", "users", current_user.user_id)
    db.commit()
    return MessageResponse(message="Password changed successfully")


@router.post("/password-change-otp", response_model=MessageResponse)
def request_password_change_otp(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if not email_delivery_configured():
        raise HTTPException(status_code=503, detail="Email delivery is not configured")
    if not current_user.email_verified:
        raise HTTPException(status_code=403, detail="Verify your email before changing your password")
    try:
        sent = issue_otp(db, current_user, PASSWORD_CHANGE)
        if sent:
            log_audit(db, current_user.user_id, "password_change_code_requested", "users", current_user.user_id)
        db.commit()
    except EmailDeliveryError as exc:
        db.rollback()
        logger.exception("Password change code delivery failed")
        raise HTTPException(status_code=503, detail="Could not send password change code") from exc
    return MessageResponse(message="If eligible, a password change code has been sent.")


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
