"""Minimal SMTP delivery for account-security email; credentials are env-only."""

import smtplib
from email.message import EmailMessage

from backend.app.config import settings


class EmailDeliveryError(RuntimeError):
    """Raised when outbound email is missing configuration or cannot be sent."""


def email_delivery_configured() -> bool:
    return all((settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.smtp_from_email))


def send_otp_email(recipient: str, purpose: str, code: str, expires_minutes: int) -> None:
    if not email_delivery_configured():
        raise EmailDeliveryError("Email delivery is not configured")

    if purpose == "email_verification":
        subject = "Verify your XAI-HEDL account"
        action = "verify your email address"
    else:
        subject = "Your XAI-HEDL password reset code"
        action = "reset your password"

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(
        f"Use this one-time code to {action}: {code}\n\n"
        f"The code expires in {expires_minutes} minutes and can only be used once. "
        "If you did not request this, you can ignore this email."
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Could not deliver email") from exc
