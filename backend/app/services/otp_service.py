"""Hash, rate-limit, expire, and consume one-time email challenges."""

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets

from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.services.email_service import send_otp_email
from database.models.email_otp_challenge import EmailOtpChallenge
from database.models.user import User

EMAIL_VERIFICATION = "email_verification"
PASSWORD_RESET = "password_reset"
PASSWORD_CHANGE = "password_change"


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _hash_code(user_id, purpose: str, code: str) -> str:
    secret = settings.otp_hash_secret or settings.jwt_secret
    message = f"{user_id}:{purpose}:{code}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def issue_otp(db: Session, user: User, purpose: str) -> bool:
    """Create and send a new code; return False when resend cooldown applies."""
    now = datetime.now(timezone.utc)
    latest = (
        db.query(EmailOtpChallenge)
        .filter(EmailOtpChallenge.user_id == user.user_id, EmailOtpChallenge.purpose == purpose)
        .order_by(EmailOtpChallenge.created_at.desc())
        .first()
    )
    if latest and (now - _utc(latest.created_at)).total_seconds() < settings.otp_resend_cooldown_seconds:
        return False

    db.query(EmailOtpChallenge).filter(
        EmailOtpChallenge.user_id == user.user_id,
        EmailOtpChallenge.purpose == purpose,
        EmailOtpChallenge.consumed_at.is_(None),
    ).update({EmailOtpChallenge.consumed_at: now}, synchronize_session=False)

    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge = EmailOtpChallenge(
        user_id=user.user_id,
        purpose=purpose,
        code_hash=_hash_code(user.user_id, purpose, code),
        attempts=0,
        created_at=now,
        expires_at=now + timedelta(minutes=settings.otp_expiration_minutes),
    )
    db.add(challenge)
    send_otp_email(user.email, purpose, code, settings.otp_expiration_minutes)
    return True


def consume_otp(db: Session, user: User, purpose: str, code: str) -> bool:
    """Consume a valid code or persist a failed attempt; callers commit either result."""
    now = datetime.now(timezone.utc)
    challenge = (
        db.query(EmailOtpChallenge)
        .filter(
            EmailOtpChallenge.user_id == user.user_id,
            EmailOtpChallenge.purpose == purpose,
            EmailOtpChallenge.consumed_at.is_(None),
        )
        .order_by(EmailOtpChallenge.created_at.desc())
        .first()
    )
    if not challenge:
        return False
    if _utc(challenge.expires_at) <= now or challenge.attempts >= settings.otp_max_attempts:
        challenge.consumed_at = now
        return False

    expected = _hash_code(user.user_id, purpose, code)
    if not hmac.compare_digest(challenge.code_hash, expected):
        challenge.attempts += 1
        if challenge.attempts >= settings.otp_max_attempts:
            challenge.consumed_at = now
        return False

    challenge.consumed_at = now
    return True
