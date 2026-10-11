import uuid
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import (
    UserLogin,
    UserRegister,
    UserProfileResponse,
    TokenResponse,
    UserRoleUpdate,
)
from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.dependencies import get_current_user, require_admin

router = APIRouter(tags=["Authentication & Users"])

# -----------------------------------------------------------------------------
# Public Registration
# -----------------------------------------------------------------------------
@router.post(
    "/auth/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new staff account"
)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new laboratory staff member.
    SECURITY REQUIREMENT: Role is strictly forced to TECHNICIAN regardless
    of any role parameter supplied in the client request.
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

    # Create user with strictly forced TECHNICIAN role
    new_user = User(
        id=str(uuid.uuid4()),
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=hashed_password,
        role="TECHNICIAN",  # Forced to TECHNICIAN; cannot self-promote to ADMIN
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate secure, expiring JWT access token
    token_data = create_access_token(
        user_id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
    )

    return TokenResponse(
        access_token=token_data["access_token"],
        token_type=token_data["token_type"],
        expires_in=token_data["expires_in"],
        expires_at=token_data["expires_at"],
        user=UserProfileResponse.model_validate(new_user),
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
    Uses timing-attack safe password verification.
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
