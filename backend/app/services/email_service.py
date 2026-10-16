import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import Tuple

logger = logging.getLogger("foodai.email")

def load_env_file():
    """
    Safely load key-value pairs from .env file into os.environ
    if not already defined in system environment.
    Checks backend/.env first, then root .env.
    """
    candidates = [
        Path(__file__).resolve().parent.parent.parent / ".env",          # backend/.env
        Path(__file__).resolve().parent.parent.parent.parent / ".env"   # root/.env
    ]
    for env_path in candidates:
        if env_path.exists():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception as e:
                logger.warning("Could not read .env file at %s: %s", env_path, e)

# Trigger loading on import
load_env_file()

def get_smtp_config():
    """Retrieve SMTP settings from environment variables."""
    # Re-check env in case it changed dynamically
    load_env_file()
    host = os.environ.get("SMTP_HOST", "").strip()
    port_str = os.environ.get("SMTP_PORT", "587").strip()
    try:
        port = int(port_str)
    except ValueError:
        port = 587
    username = os.environ.get("SMTP_USERNAME", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "").strip()
    from_email = os.environ.get("SMTP_FROM_EMAIL", "").strip() or username or "noreply@foodai.com"
    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "from_email": from_email,
        "is_configured": bool(host and (username or host == "localhost"))
    }

def send_account_creation_email(
    customer_name: str,
    customer_id: int,
    mobile_number: str,
    email_address: str
) -> Tuple[bool, str]:
    """
    Send account registration confirmation email to customer.
    
    Returns (success: bool, status_message: str).
    Guaranteed not to raise an unhandled exception or expose passwords.
    """
    if not email_address or not email_address.strip():
        logger.info("[Email Service] No email address provided for customer ID #%s.", customer_id)
        return False, "No email address provided for notification."

    cfg = get_smtp_config()
    
    if not cfg["is_configured"]:
        msg = (
            f"[Email Service] SMTP configuration missing (SMTP_HOST/SMTP_USERNAME not set). "
            f"Account created successfully, but confirmation email could not be sent to {email_address}."
        )
        logger.info(msg)
        return False, "Customer created successfully, but confirmation email could not be sent (SMTP not configured)."

    subject = "Welcome to FoodAI - Your Account Has Been Created"
    body_text = (
        f"Hello {customer_name},\n\n"
        f"Your FoodAI account has been successfully created.\n\n"
        f"Account Details:\n"
        f"Customer ID: {customer_id}\n"
        f"Mobile Number: {mobile_number or 'N/A'}\n"
        f"Email: {email_address}\n\n"
        f"You can now log in to FoodAI using your registered mobile number.\n\n"
        f"FoodAI will use your available profile and order history to provide personalized food recommendations.\n\n"
        f"Regards,\n"
        f"FoodAI Team\n"
    )

    msg = MIMEMultipart()
    msg["From"] = cfg["from_email"]
    msg["To"] = email_address
    msg["Subject"] = subject
    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    try:
        if cfg["port"] == 465:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=10)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=10)
            server.ehlo()
            try:
                server.starttls()
                server.ehlo()
            except Exception:
                # server might not support starttls (e.g. local test smtp)
                pass

        if cfg["username"] and cfg["password"]:
            server.login(cfg["username"], cfg["password"])

        server.send_message(msg)
        server.quit()
        logger.info("Welcome email sent successfully to %s for customer ID #%s.", email_address, customer_id)
        return True, f"Welcome confirmation email sent to {email_address}."

    except Exception as e:
        # Safe logging without exposing passwords or secret keys
        err_type = type(e).__name__
        logger.warning(
            "Failed to send confirmation email to %s (Customer ID #%s): [%s] %s",
            email_address, customer_id, err_type, str(e)
        )
        return False, f"Customer created successfully, but confirmation email could not be sent: {err_type}"
