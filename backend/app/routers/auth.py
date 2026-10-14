import uuid
import secrets
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import (
    UserLogin,
    UserRegister,
    UserProfileResponse,
    TokenResponse,
    UserRegisterResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    UserRoleUpdate,
)
from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.dependencies import get_current_user, require_admin
from backend.app.services.email_service import send_verification_email, is_smtp_configured

router = APIRouter(tags=["Authentication & Users"])

# -----------------------------------------------------------------------------
# Public Registration with Email Verification
# -----------------------------------------------------------------------------
@router.post(
    "/auth/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new staff account"
)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new laboratory staff member.
    SECURITY REQUIREMENTS:
    1. Role is strictly forced to TECHNICIAN regardless of client input.
    2. Accounts require email verification before they can sign in.
    3. Issues a secure, single-use, time-limited verification token.
    4. If SMTP credentials are not configured, provides development simulation link.
    """
    normalized_email = payload.email.lower().strip()

    # Check if user already exists
    existing = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address is already registered."
        )

    # Hash password securely using PBKDF2-HMAC-SHA256 (260,000 rounds)
    hashed_password = hash_password(payload.password)

    # Generate secure 32-byte single-use verification token (valid for 24 hours)
    verification_token = secrets.token_urlsafe(32)
    token_expires_at = datetime.utcnow() + timedelta(hours=24)

    # Create user with strictly forced TECHNICIAN role and unverified email
    new_user = User(
        id=str(uuid.uuid4()),
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=hashed_password,
        role="TECHNICIAN",  # Forced to TECHNICIAN; cannot self-promote to ADMIN
        is_email_verified=False,
        email_verification_token=verification_token,
        email_verification_token_expires_at=token_expires_at,
        last_verification_email_sent_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Dispatch verification email (or log development simulation)
    sent_live, sim_note, verification_url = send_verification_email(
        recipient_email=new_user.email,
        recipient_name=new_user.name,
        verification_token=verification_token,
    )

    simulation_data = None
    if not is_smtp_configured():
        simulation_data = {
            "mode": "DEVELOPMENT_SIMULATION",
            "message": "SMTP credentials not configured. Verification email was simulated.",
            "verification_token": verification_token,
            "verification_url": verification_url,
        }

    return UserRegisterResponse(
        message=(
            "Staff account registered successfully. "
            "A verification link has been sent to your email address. "
            "Please verify your email before logging in."
        ),
        user=UserProfileResponse.model_validate(new_user),
        is_email_verified=False,
        access_token=None,
        simulation=simulation_data,
    )

# -----------------------------------------------------------------------------
# Staff Email Verification
# -----------------------------------------------------------------------------
@router.post(
    "/auth/verify-email",
    response_model=VerifyEmailResponse,
    summary="Verify staff email address using token"
)
def verify_staff_email_post(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """
    Validates a single-use, time-limited email verification token and marks
    the staff account as verified.
    """
    return _process_email_verification(payload.token.strip(), db)

@router.get(
    "/auth/verify-email",
    response_model=VerifyEmailResponse,
    summary="Verify staff email via URL link"
)
def verify_staff_email_get(token: str = Query(..., min_length=10), db: Session = Depends(get_db)):
    """
    Direct browser link handler for email verification.
    """
    return _process_email_verification(token.strip(), db)

def _process_email_verification(token: str, db: Session) -> VerifyEmailResponse:
    user = db.query(User).filter(User.email_verification_token == token).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used verification token. Please request a new verification link."
        )

    # Check expiration (24 hour window)
    if user.email_verification_token_expires_at and user.email_verification_token_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new verification link."
        )

    # Single-use: clear token upon successful verification
    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_token_expires_at = None
    user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    return VerifyEmailResponse(
        success=True,
        message="Your email address has been successfully verified. You may now log in.",
        email=user.email,
    )

# -----------------------------------------------------------------------------
# Resend Email Verification (with Rate Limiting)
# -----------------------------------------------------------------------------
@router.post(
    "/auth/resend-verification",
    response_model=ResendVerificationResponse,
    summary="Resend verification email to registered staff"
)
def resend_verification_email(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    """
    Resends a verification email with a fresh single-use token.
    SECURITY: Enforces a 60-second rate limit between dispatches per account.
    """
    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()

    # Generic response to prevent user enumeration
    if not user:
        return ResendVerificationResponse(
            success=True,
            message="If this email is registered and unverified, a verification link has been sent.",
            already_verified=False,
        )

    if user.is_email_verified:
        return ResendVerificationResponse(
            success=True,
            message="This email address is already verified. You can log in directly.",
            already_verified=True,
        )

    # Rate limiting: 60 seconds minimum interval
    now = datetime.utcnow()
    if user.last_verification_email_sent_at:
        seconds_elapsed = (now - user.last_verification_email_sent_at).total_seconds()
        if seconds_elapsed < 60:
            retry_after = int(60 - seconds_elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {retry_after} seconds before requesting another verification email.",
                headers={"Retry-After": str(retry_after)},
            )

    # Generate new token
    fresh_token = secrets.token_urlsafe(32)
    user.email_verification_token = fresh_token
    user.email_verification_token_expires_at = now + timedelta(hours=24)
    user.last_verification_email_sent_at = now
    user.updated_at = now
    db.commit()

    sent_live, sim_note, verification_url = send_verification_email(
        recipient_email=user.email,
        recipient_name=user.name,
        verification_token=fresh_token,
    )

    simulation_data = None
    if not is_smtp_configured():
        simulation_data = {
            "mode": "DEVELOPMENT_SIMULATION",
            "message": "SMTP credentials not configured. Email verification was simulated.",
            "verification_token": fresh_token,
            "verification_url": verification_url,
        }

    return ResendVerificationResponse(
        success=True,
        message="A verification link has been sent to your email address.",
        already_verified=False,
        simulation=simulation_data,
    )

# -----------------------------------------------------------------------------
# Staff Login
# -----------------------------------------------------------------------------
@router.post(
    "/auth/login",
    response_model=TokenResponse,
    summary="Authenticate staff and issue JWT token"
)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates staff credentials and returns a signed, expiring JWT token.
    SECURITY REQUIREMENT: Enforces is_email_verified. Unverified staff cannot log in.
    """
    normalized_email = payload.email.lower().strip()

    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        # Generic message prevents user enumeration attacks
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Prevent unverified staff from logging in
    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email address has not been verified. Please check your inbox or request a new verification link."
        )

    # Generate token
    token_data = create_access_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
    )

    return TokenResponse(
        access_token=token_data["access_token"],
        token_type=token_data["token_type"],
        expires_in=token_data["expires_in"],
        expires_at=token_data["expires_at"],
        user=UserProfileResponse.model_validate(user),
    )

# -----------------------------------------------------------------------------
# Authenticated Current User Profile
# -----------------------------------------------------------------------------
@router.get(
    "/auth/me",
    response_model=UserProfileResponse,
    summary="Get authenticated staff profile"
)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the profile of the currently authenticated staff member.
    Never exposes the password hash.
    """
    return UserProfileResponse.model_validate(current_user)

# -----------------------------------------------------------------------------
# Administrator Staff & Role Management
# -----------------------------------------------------------------------------
@router.get(
    "/users",
    response_model=List[UserProfileResponse],
    summary="List laboratory staff members (Administrator only)"
)
def list_users(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Returns all registered laboratory staff.
    SECURITY REQUIREMENT: Strictly requires an authenticated user with ADMIN role.
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserProfileResponse.model_validate(u) for u in users]


@router.patch(
    "/users/{user_id}/role",
    response_model=UserProfileResponse,
    summary="Update staff role (Administrator only)"
)
def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Promotes or demotes a laboratory staff member's role.
    SECURITY REQUIREMENT: Strictly requires an authenticated user with ADMIN role.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' was not found."
        )

    # Prevent an administrator from accidentally demoting their own active session
    if target_user.id == current_admin.id and payload.role != "ADMIN":
        # Check if another admin exists
        other_admins = db.query(User).filter(User.role == "ADMIN", User.id != current_admin.id).count()
        if other_admins == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote yourself: You are the sole administrator in the system."
            )

    target_user.role = payload.role
    target_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(target_user)

    return UserProfileResponse.model_validate(target_user)
