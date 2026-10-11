from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
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
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    expires_at: str
    user: UserProfileResponse

class UserRoleUpdate(BaseModel):
    role: Literal["ADMIN", "TECHNICIAN"] = Field(..., description="Target role: ADMIN or TECHNICIAN")
