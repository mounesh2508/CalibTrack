from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, Dict, Any
from datetime import datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, description="Account password")

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full staff name")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128, description="Password (at least 8 characters)")
    # Note: Public registration strictly ignores any submitted role field to prevent self-promotion!

class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_email_verified: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    expires_at: str
    user: UserProfileResponse

class UserRegisterResponse(BaseModel):
    message: str
    user: UserProfileResponse
    is_email_verified: bool = False
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    expires_in: Optional[int] = None
    expires_at: Optional[str] = None
    simulation: Optional[Dict[str, Any]] = None

class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10, description="Verification token sent via email")

class VerifyEmailResponse(BaseModel):
    success: bool
    message: str
    email: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ResendVerificationResponse(BaseModel):
    success: bool
    message: str
    already_verified: bool = False
    simulation: Optional[Dict[str, Any]] = None

class UserRoleUpdate(BaseModel):
    role: Literal["ADMIN", "TECHNICIAN"] = Field(..., description="Target role: ADMIN or TECHNICIAN")

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=10, description="Verification OTP code")
    type: Optional[str] = "REGISTRATION"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=8, description="New account password")
    reset_token: Optional[str] = None
    code: Optional[str] = None

class ResendCodeRequest(BaseModel):
    email: EmailStr
    type: Optional[str] = "REGISTRATION"

