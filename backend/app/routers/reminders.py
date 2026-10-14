from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.dependencies import require_staff, require_admin
from backend.app.services.reminder_service import (
    get_or_create_reminder_settings,
    update_reminder_settings,
    evaluate_and_dispatch_reminders,
)
from backend.app.services.email_service import is_smtp_configured, send_calibration_reminder_email

router = APIRouter(prefix="/reminders", tags=["Calibration Reminders"])

class ReminderSettingsUpdate(BaseModel):
    reminder_days_before: Optional[int] = Field(None, ge=1, le=180, description="Notice window in days (1 to 180)")
    email_enabled: Optional[bool] = Field(None, description="Enable email alerts")
    in_app_enabled: Optional[bool] = Field(None, description="Enable in-app notifications")

class ReminderSettingsResponse(BaseModel):
    reminder_days_before: int
    email_enabled: bool
    in_app_enabled: bool
    smtp_configured: bool

class TestEmailPayload(BaseModel):
    recipient_email: Optional[EmailStr] = None

@router.get("/settings", response_model=ReminderSettingsResponse, summary="Get reminder configuration")
def get_settings(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """
    Retrieves current calibration reminder settings and SMTP readiness status.
    SECURITY: Requires authenticated staff (TECHNICIAN or ADMIN).
    """
    settings = get_or_create_reminder_settings(db)
    return ReminderSettingsResponse(
        reminder_days_before=settings.reminder_days_before,
        email_enabled=settings.email_enabled,
        in_app_enabled=settings.in_app_enabled,
        smtp_configured=is_smtp_configured(),
    )

@router.put("/settings", response_model=ReminderSettingsResponse, summary="Update reminder configuration")
def update_settings(
    payload: ReminderSettingsUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Updates calibration reminder settings.
    SECURITY: Strictly requires ADMIN role.
    """
    try:
        updated = update_reminder_settings(
            db=db,
            reminder_days_before=payload.reminder_days_before,
            email_enabled=payload.email_enabled,
            in_app_enabled=payload.in_app_enabled,
        )
        return ReminderSettingsResponse(
            reminder_days_before=updated.reminder_days_before,
            email_enabled=updated.email_enabled,
            in_app_enabled=updated.in_app_enabled,
            smtp_configured=is_smtp_configured(),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/trigger", summary="Manually trigger reminder evaluation")
def trigger_reminders(
    dry_run: bool = Query(False, description="Simulate evaluation without modifying database or sending real emails"),
    equipment_id: Optional[str] = Query(None, description="Evaluate single specific equipment asset"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """
    Manually triggers evaluation of calibration due dates and reminder dispatch.
    Supports dry-run simulation mode and single-asset target.
    SECURITY: Requires authenticated staff. Protected against unauthenticated public access.
    """
    result = evaluate_and_dispatch_reminders(
        db=db,
        dry_run=dry_run,
        target_equipment_id=equipment_id,
    )
    return result

@router.post("/test-email", summary="Send sample test alert to a single recipient (Admin only)")
def send_test_reminder_email(
    payload: Optional[TestEmailPayload] = None,
    current_admin: User = Depends(require_admin),
):
    """
    Sends a single test calibration alert email to verify SMTP delivery safely.
    SECURITY: Strictly requires ADMIN role. Never sends test emails to every user.
    """
    target_email = payload.recipient_email if payload and payload.recipient_email else current_admin.email
    success, err_msg = send_calibration_reminder_email(
        recipient_email=str(target_email),
        equipment_code="TEST-ASSET-01",
        equipment_name="Metrology Verification Standard (Test Run)",
        department="Quality Assurance Test",
        due_date="2026-12-31",
        days_remaining=5,
        is_overdue=False,
    )
    return {
        "success": success,
        "recipient": target_email,
        "smtp_configured": is_smtp_configured(),
        "error_message": err_msg,
    }
