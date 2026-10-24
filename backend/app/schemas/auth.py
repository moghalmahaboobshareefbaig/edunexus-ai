"""
EduNexus AI — Authentication & Registration Schemas
"""

from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    """Payload for registering a new user in Supabase Auth & user_profiles."""
    email: EmailStr = Field(..., description="Institutional email address")
    password: str = Field(..., min_length=6, max_length=72, description="Password (at least 6 characters)")
    full_name: Optional[str] = Field(default=None, max_length=100, description="Full Name of the user")
    first_name: Optional[str] = Field(default=None, max_length=100, description="First Name of the user")
    last_name: Optional[str] = Field(default=None, max_length=100, description="Last Name of the user")
    role: str = Field(default="advisor", description="Institutional role: advisor, faculty, student, administrator, or counselor")
    department: Optional[str] = Field(default=None, max_length=100, description="Academic department / school")
    student_id: Optional[str] = Field(default=None, max_length=32, description="Optional Student ID / Roll number if registering as a student")


class UserRegisterResponse(BaseModel):
    """Response returned upon successful registration."""
    status: str = "success"
    message: str
    user_id: str
    email: str
    role: str
    full_name: str
    access_token: Optional[str] = None
    is_active: bool = True
    is_demo: Optional[bool] = None


class DemoCredentialInfo(BaseModel):
    """Details of pre-configured live credentials for immediate verification."""
    role: str
    label: str
    email: str
    password: str
    description: str
    badge: str
    is_read_only: bool


class DemoCredentialsListResponse(BaseModel):
    """List of all available pre-configured live test credentials."""
    status: str = "success"
    database_connected: bool
    credentials: List[DemoCredentialInfo]
