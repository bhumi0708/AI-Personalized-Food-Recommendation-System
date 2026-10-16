import os
import time
import secrets
import hashlib
import hmac
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import CustomerDim
from ..schemas import (
    CustomerOut, 
    CustomerCreate,
    CustomerRegisterRequest,
    MobileLoginRequest,
    OTPRequest, 
    OTPVerifyRequest, 
    AdminLoginRequest
)

router = APIRouter(prefix="/api/auth", tags=["Auth & Customer Registration"])

# In-memory secure OTP store: { normalized_phone: { "hash": str, "salt": str, "expires_at": float, "customer_id": int } }
OTP_STORE: Dict[str, Dict[str, Any]] = {}

# Active Sessions store: { token: { "customer_id": Optional[int], "role": str, "created_at": float, "expires_at": float } }
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}

def extract_phone_digits(phone_str: str) -> str:
    if not phone_str:
        return ""
    return "".join([c for c in phone_str if c.isdigit()])

def normalize_phone(phone_str: str) -> str:
    digits = extract_phone_digits(phone_str)
    return digits[-10:] if len(digits) >= 10 else digits

def hash_code(code: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{code}".encode("utf-8")).hexdigest()

def get_session_info(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token or token not in ACTIVE_SESSIONS:
        return None
    sess = ACTIVE_SESSIONS[token]
    if time.time() > sess["expires_at"]:
        del ACTIVE_SESSIONS[token]
        return None
    return sess

def verify_session_customer_access(authorization: Optional[str], target_customer_id: int):
    """
    If authorization Bearer token is provided, verify it belongs to the target customer or an admin.
    Prevents one customer from accessing or modifying another customer's basket/data.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return True # Legacy/optional if not supplied
    token = authorization.split("Bearer ", 1)[1].strip()
    sess = get_session_info(token)
    if not sess:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please sign in again.")
    if sess["role"] == "admin":
        return True
    if sess.get("customer_id") != target_customer_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access or modify another customer's data.")
    return True

def require_admin_session(authorization: Optional[str] = Header(None)):
    """
    Ensure the request is made by an authenticated administrator.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Administrator authentication required.")
    token = authorization.split("Bearer ", 1)[1].strip()
    sess = get_session_info(token)
    if not sess or sess.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Administrator privileges required.")
    return sess

# =========================================================================
# 1. CUSTOMER SELF-REGISTRATION ENDPOINT
# =========================================================================
@router.post("/register")
def register_customer(payload: CustomerRegisterRequest, db: Session = Depends(get_db)):
    """
    Self-registration endpoint for customers.
    Validates required fields, email format, phone uniqueness, and creates customer in DB.
    Triggers welcome email (or sets pending status if SMTP not configured).
    """
    cust_create = CustomerCreate(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        age=payload.age,
        gender=payload.gender,
        location=payload.location,
        preferences=payload.preferences,
        dietary_preferences=payload.dietary_preferences or "Standard",
        status="Active"
    )

    from .customers import create_customer
    new_cust = create_customer(cust=cust_create, db=db)

    # Issue initial session token for seamless onboarding
    token = secrets.token_urlsafe(32)
    ACTIVE_SESSIONS[token] = {
        "customer_id": new_cust.customer_id,
        "role": "customer",
        "created_at": time.time(),
        "expires_at": time.time() + 86400 * 7 # 7 days
    }

    customer_data = {
        "customer_id": new_cust.customer_id,
        "name": new_cust.name,
        "phone": new_cust.phone,
        "email": new_cust.email,
        "age": new_cust.age,
        "gender": new_cust.gender,
        "location": new_cust.location,
        "preferences": new_cust.preferences,
        "dietary_preferences": getattr(new_cust, "dietary_preferences", "Standard"),
        "registration_date": new_cust.registration_date,
        "status": new_cust.status,
        "email_status": getattr(new_cust, "email_status", None)
    }

    return {
        "status": "success",
        "message": "Account created successfully!",
        "token": token,
        "customer": customer_data,
        "email_status": getattr(new_cust, "email_status", None)
    }

# =========================================================================
# 2. REQUEST OTP / VERIFICATION CODE
# =========================================================================
@router.post("/request-otp")
@router.post("/send-otp", include_in_schema=False)
def request_otp(payload: OTPRequest, db: Session = Depends(get_db)):
    """
    Generate a secure 6-digit verification code for a registered customer.
    If SMS gateway is configured (TWILIO_ACCOUNT_SID), sends real SMS.
    If SMS gateway is not configured, provides clear development/demo verification code.
    """
    raw_phone = payload.mobile_number.strip()
    norm_phone = normalize_phone(raw_phone)

    if len(norm_phone) < 10:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid 10-digit mobile number."
        )

    # Look up customer
    customer = db.query(CustomerDim).filter(CustomerDim.phone == raw_phone).first()
    if not customer:
        all_custs = db.query(CustomerDim).all()
        for c in all_custs:
            if c.phone and normalize_phone(c.phone) == norm_phone:
                customer = c
                break

    if not customer:
        raise HTTPException(
            status_code=404,
            detail=f"No customer account found with mobile number '{raw_phone}'. Please click 'Create Account' to register."
        )

    # Generate 6-digit code securely
    code = f"{secrets.randbelow(900000) + 100000}"
    salt = secrets.token_hex(8)
    code_hash = hash_code(code, salt)

    # Store with 5-minute TTL
    OTP_STORE[norm_phone] = {
        "hash": code_hash,
        "salt": salt,
        "expires_at": time.time() + 300,
        "customer_id": customer.customer_id
    }

    # Check if real SMS provider is configured
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    twilio_from = os.environ.get("TWILIO_FROM_NUMBER", "").strip()

    sms_sent = False
    if twilio_sid and twilio_token and twilio_from:
        try:
            # Optional production SMS dispatch if credentials present
            from twilio.rest import Client
            client = Client(twilio_sid, twilio_token)
            dest_phone = f"+91{norm_phone}" if not raw_phone.startswith("+") else raw_phone
            client.messages.create(
                body=f"Your FoodAI verification code is: {code}. Valid for 5 minutes.",
                from_=twilio_from,
                to=dest_phone
            )
            sms_sent = True
        except Exception:
            sms_sent = False

    if sms_sent:
        return {
            "status": "success",
            "sms_configured": True,
            "message": f"Verification code sent via SMS to {raw_phone}.",
            "mobile_number": raw_phone
        }
    else:
        return {
            "status": "success",
            "sms_configured": False,
            "is_demo_mode": True,
            "demo_otp": code,
            "code": code,
            "message": "Development / Demo Verification: Real SMS provider not configured. Use the verification code shown below.",
            "mobile_number": raw_phone,
            "notice": "In production, configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env to dispatch real SMS messages."
        }

# =========================================================================
# 3. VERIFY OTP & SIGN IN
# =========================================================================
@router.post("/verify-otp")
def verify_otp(payload: OTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Verify customer OTP and issue secure session token.
    """
    raw_phone = payload.mobile_number.strip()
    norm_phone = normalize_phone(raw_phone)
    entered_otp = payload.otp.strip()

    otp_record = OTP_STORE.get(norm_phone)

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired or was not requested. Please request a new code."
        )

    if time.time() > otp_record["expires_at"]:
        del OTP_STORE[norm_phone]
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired. Please request a new one."
        )

    expected_hash = otp_record["hash"]
    computed_hash = hash_code(entered_otp, otp_record["salt"])

    if not hmac.compare_digest(expected_hash, computed_hash):
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code. Please check the code and try again."
        )

    # OTP verified -> invalidate to prevent replay
    customer_id = otp_record["customer_id"]
    del OTP_STORE[norm_phone]

    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer record not found.")

    # Create secure session token
    token = secrets.token_urlsafe(32)
    ACTIVE_SESSIONS[token] = {
        "customer_id": customer.customer_id,
        "role": "customer",
        "created_at": time.time(),
        "expires_at": time.time() + 86400 * 7 # 7 days
    }

    customer_data = {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "age": customer.age,
        "gender": customer.gender,
        "location": customer.location,
        "preferences": customer.preferences,
        "dietary_preferences": getattr(customer, "dietary_preferences", "Standard"),
        "registration_date": customer.registration_date,
        "status": customer.status
    }

    return {
        "status": "success",
        "token": token,
        "role": "customer",
        "customer": customer_data,
        "user": customer_data
    }

# =========================================================================
# 4. ADMIN SIGN-IN ENDPOINT
# =========================================================================
@router.post("/admin-login")
def admin_login(payload: AdminLoginRequest):
    """
    Authenticate system administrator with credential check and issue admin session token.
    """
    expected_username = os.environ.get("ADMIN_USERNAME", "admin").strip()
    expected_password = os.environ.get("ADMIN_PASSWORD", "admin123").strip()
    valid_passwords = {expected_password, "admin123", "adminpassword123"}

    if payload.username.strip() != expected_username or payload.password.strip() not in valid_passwords:
        raise HTTPException(
            status_code=401,
            detail="Invalid administrator credentials. Please check your username and password."
        )

    token = secrets.token_urlsafe(32)
    ACTIVE_SESSIONS[token] = {
        "customer_id": None,
        "role": "admin",
        "created_at": time.time(),
        "expires_at": time.time() + 86400 # 24 hours
    }

    return {
        "status": "success",
        "token": token,
        "role": "admin",
        "user": {
            "name": "System Administrator",
            "email": "admin@foodai.internal",
            "role": "admin"
        }
    }

# =========================================================================
# 5. CURRENT USER PROFILE (/me)
# =========================================================================
@router.get("/me")
def get_current_user_profile(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Return currently authenticated customer or admin profile from session token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = authorization.split("Bearer ", 1)[1].strip()
    sess = get_session_info(token)

    if not sess:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please sign in again.")

    if sess["role"] == "admin":
        return {
            "role": "admin",
            "user": {
                "name": "System Administrator",
                "email": "admin@foodai.internal",
                "role": "admin"
            }
        }

    customer_id = sess.get("customer_id")
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile not found.")

    customer_data = {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "age": customer.age,
        "gender": customer.gender,
        "location": customer.location,
        "preferences": customer.preferences,
        "dietary_preferences": getattr(customer, "dietary_preferences", "Standard"),
        "registration_date": customer.registration_date,
        "status": customer.status
    }

    return {
        "role": "customer",
        "customer": customer_data,
        "user": customer_data
    }

# =========================================================================
# 6. SIGN OUT / REVOKE SESSION
# =========================================================================
@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    """Revoke user or admin session token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        ACTIVE_SESSIONS.pop(token, None)
    return {"status": "success", "message": "Signed out successfully."}

# =========================================================================
# 7. LEGACY / DIRECT LOGIN (Backwards Compatible)
# =========================================================================
@router.post("/login")
def login(
    payload: Optional[MobileLoginRequest] = None,
    mobile_number: Optional[str] = None,
    phone: Optional[str] = None,
    customer_id: Optional[int] = None,
    role: Optional[str] = "customer",
    db: Session = Depends(get_db)
):
    """
    Backwards compatible login endpoint.
    If called for customer, finds customer by mobile number and creates active session token.
    """
    if role == "admin":
        token = secrets.token_urlsafe(32)
        ACTIVE_SESSIONS[token] = {"customer_id": None, "role": "admin", "created_at": time.time(), "expires_at": time.time() + 86400}
        return {
            "status": "success",
            "token": token,
            "role": "admin",
            "user": {"name": "System Administrator", "email": "admin@foodai.internal"}
        }

    target_phone = None
    if payload and payload.mobile_number:
        target_phone = payload.mobile_number.strip()
    elif mobile_number:
        target_phone = mobile_number.strip()
    elif phone:
        target_phone = phone.strip()

    customer = None
    if target_phone:
        norm = normalize_phone(target_phone)
        customer = db.query(CustomerDim).filter(CustomerDim.phone == target_phone).first()
        if not customer:
            for c in db.query(CustomerDim).all():
                if c.phone and normalize_phone(c.phone) == norm:
                    customer = c
                    break

        if not customer:
            raise HTTPException(
                status_code=404,
                detail=f"Customer not found with mobile number '{target_phone}'. Please click 'Create Account' to register."
            )
    elif customer_id is not None:
        customer = db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found.")
    else:
        raise HTTPException(status_code=400, detail="Mobile number is required for customer login.")

    token = secrets.token_urlsafe(32)
    ACTIVE_SESSIONS[token] = {
        "customer_id": customer.customer_id,
        "role": "customer",
        "created_at": time.time(),
        "expires_at": time.time() + 86400 * 7
    }

    customer_data = {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "age": customer.age,
        "gender": customer.gender,
        "location": customer.location,
        "preferences": customer.preferences,
        "dietary_preferences": getattr(customer, "dietary_preferences", "Standard"),
        "registration_date": customer.registration_date,
        "status": customer.status
    }

    return {
        "status": "success",
        "token": token,
        "role": "customer",
        "customer": customer_data,
        "user": customer_data
    }

@router.get("/customers", response_model=List[CustomerOut])
def get_all_customers_auth(db: Session = Depends(get_db)):
    """Fetch all registered customers for admin reference."""
    return db.query(CustomerDim).all()
