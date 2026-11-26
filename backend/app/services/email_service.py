"""SMTP delivery for OTP security emails and patient clinical PDF reports."""

import html
import smtplib
from email.message import EmailMessage

from backend.app.config import settings


class EmailDeliveryError(RuntimeError):
    """Raised when outbound email is missing configuration or cannot be sent."""


def email_delivery_configured() -> bool:
    return all((settings.smtp_host, settings.smtp_username, settings.smtp_password, settings.smtp_from_email))


def _render_branded_html(
    title: str,
    body_html: str,
    footer_note: str,
) -> str:
    """Build an inline-CSS, table-based 600px HTML email matching the XAI-HEDL palette."""
    safe_title = html.escape(title)
    safe_footer = html.escape(footer_note)
    return (
        '<!DOCTYPE html>'
        '<html lang="en">'
        '<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        'style="background-color:#F1F5F9;padding:24px 12px;">'
        '<tr><td align="center">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" '
        'style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:10px;'
        'overflow:hidden;border:1px solid #E2E8F0;">'
        # Header bar
        '<tr><td style="background-color:#0B1F3A;padding:20px 28px;border-bottom:3px solid #14B8A6;">'
        '<p style="margin:0;font-size:18px;font-weight:700;letter-spacing:0.5px;color:#FFFFFF;">'
        'XAI-HEDL'
        '</p>'
        '<p style="margin:4px 0 0 0;font-size:12px;color:#5EEAD4;">'
        'Explainable Hybrid Ensemble Deep Learning System'
        '</p>'
        '</td></tr>'
        # Content cell
        '<tr><td style="padding:28px 28px 20px 28px;">'
        f'<h1 style="margin:0 0 14px 0;font-size:20px;line-height:1.3;color:#0B1F3A;">{safe_title}</h1>'
        f'{body_html}'
        '</td></tr>'
        # Footer cell
        '<tr><td style="background-color:#F8FAFC;padding:16px 28px;border-top:1px solid #E2E8F0;">'
        f'<p style="margin:0;font-size:12px;line-height:1.5;color:#64748B;">{safe_footer}</p>'
        '</td></tr>'
        '</table>'
        '</td></tr>'
        '</table>'
        '</body>'
        '</html>'
    )


def _send_email_message(message: EmailMessage) -> None:
    if not email_delivery_configured():
        raise EmailDeliveryError("Email delivery is not configured")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Could not deliver email") from exc


def build_otp_email_message(recipient: str, purpose: str, code: str, expires_minutes: int) -> EmailMessage:
    """Construct the multi-part plain-text + inline-HTML OTP email message."""
    if purpose == "email_verification":
        subject = "Verify your XAI-HEDL account"
        action = "verify your email address"
        heading = "Verify Your Email Address"
    else:
        subject = "Your XAI-HEDL password reset code"
        action = "reset your password"
        heading = "Reset Your Password"

    plain_text = (
        f"Use this one-time code to {action}: {code}\n\n"
        f"The code expires in {expires_minutes} minutes and can only be used once. "
        "If you did not request this, you can ignore this email."
    )

    safe_code = html.escape(code)
    safe_action = html.escape(action)
    body_html = (
        f'<p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#334155;">'
        f'Use the one-time verification code below to {safe_action}:</p>'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        'style="margin:0 0 18px 0;">'
        '<tr><td align="center" style="background-color:#F8FAFC;border:2px solid #14B8A6;'
        'border-radius:8px;padding:16px 24px;">'
        f'<span style="font-family:\'Courier New\',Courier,monospace;font-size:28px;font-weight:700;'
        f'letter-spacing:8px;color:#0B1F3A;">{safe_code}</span>'
        '</td></tr>'
        '</table>'
        f'<p style="margin:0;font-size:13px;line-height:1.5;color:#475569;">'
        f'This code expires in <strong>{expires_minutes} minutes</strong> and can only be used once.</p>'
    )
    html_body = _render_branded_html(
        title=heading,
        body_html=body_html,
        footer_note="If you didn't request this code, you can safely ignore this email.",
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email or "noreply@xai-hedl.local"
    message["To"] = recipient
    message.set_content(plain_text)
    message.add_alternative(html_body, subtype="html")
    return message


def send_otp_email(recipient: str, purpose: str, code: str, expires_minutes: int) -> None:
    if not email_delivery_configured():
        raise EmailDeliveryError("Email delivery is not configured")
    message = build_otp_email_message(recipient, purpose, code, expires_minutes)
    _send_email_message(message)


def send_report_email(
    recipient: str,
    patient_name: str,
    pdf_bytes: bytes,
    generated_at: str = "",
    filename: str = "xai_hedl_report.pdf",
) -> None:
    """Send a generated clinical PDF risk report to the patient's email address."""
    if not email_delivery_configured():
        raise EmailDeliveryError("Email delivery is not configured")

    date_phrase = generated_at or "today"
    plain_text = (
        f"Hello {patient_name},\n\n"
        f"Attached is the diabetes risk report for {patient_name}, generated on {date_phrase}.\n\n"
        "This report includes an explanation of the biomarkers assessed and a glossary to help you "
        "review the results with your healthcare provider.\n\n"
        "Disclaimer: This AI-assisted report is for clinical decision support and does not replace "
        "medical diagnosis by a qualified clinician."
    )

    safe_name = html.escape(patient_name)
    safe_date = html.escape(date_phrase)
    body_html = (
        f'<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#334155;">'
        f'Hello <strong>{safe_name}</strong>,</p>'
        f'<p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#334155;">'
        f'Attached is the diabetes risk report for <strong>{safe_name}</strong>, '
        f'generated on <strong>{safe_date}</strong>.</p>'
        '<p style="margin:0;font-size:13px;line-height:1.6;color:#475569;'
        'background-color:#F8FAFC;border-left:3px solid #14B8A6;padding:10px 14px;">'
        'Inside the attached PDF, you will find your risk score, biomarker breakdown, '
        'personalized guidance, and a plain-language glossary ("Understanding This Report") '
        'to review alongside your doctor.'
        '</p>'
    )
    html_body = _render_branded_html(
        title="Your XAI-HEDL Clinical Risk Report",
        body_html=body_html,
        footer_note=(
            "This AI-assisted report is intended for clinical decision support only and does not "
            "constitute a standalone medical diagnosis. Please review all findings with your clinician."
        ),
    )

    message = EmailMessage()
    message["Subject"] = f"Your XAI-HEDL Diabetes Risk Report — {patient_name}"
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(plain_text)
    message.add_alternative(html_body, subtype="html")
    message.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=filename,
    )
    _send_email_message(message)
