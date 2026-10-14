import os
from datetime import date, datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.app.models.equipment import Equipment
from backend.app.models.notification import Notification
from backend.app.models.reminder_settings import ReminderSettings
from backend.app.models.reminder_log import ReminderLog
from backend.app.models.user import User
from backend.app.services.email_service import send_calibration_reminder_email, is_smtp_configured

def get_or_create_reminder_settings(db: Session) -> ReminderSettings:
    """
    Retrieves or creates singleton reminder settings.
    Default: reminder_days_before = 7, email_enabled = True, in_app_enabled = True.
    """
    settings = db.query(ReminderSettings).first()
    if not settings:
        settings = ReminderSettings(
            reminder_days_before=7,
            email_enabled=True,
            in_app_enabled=True,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def update_reminder_settings(
    db: Session,
    reminder_days_before: Optional[int] = None,
    email_enabled: Optional[bool] = None,
    in_app_enabled: Optional[bool] = None,
) -> ReminderSettings:
    """
    Updates reminder settings.
    """
    settings = get_or_create_reminder_settings(db)
    if reminder_days_before is not None:
        if reminder_days_before < 1 or reminder_days_before > 180:
            raise ValueError("reminder_days_before must be between 1 and 180 days.")
        settings.reminder_days_before = reminder_days_before
    if email_enabled is not None:
        settings.email_enabled = email_enabled
    if in_app_enabled is not None:
        settings.in_app_enabled = in_app_enabled
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    return settings

def evaluate_and_dispatch_reminders(
    db: Session,
    reference_date: Optional[date] = None,
    dry_run: bool = False,
    target_equipment_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluates all laboratory equipment against calibration due dates and reminder settings.
    Dispatches in-app notifications and email alerts with guaranteed multi-worker deduplication
    backed by database uniqueness constraints on ReminderLog.

    Features:
    - Safe retry: Delivery failures can be retried without hitting database unique constraint errors.
    - Dry-run mode: Evaluates which equipment needs alerts without sending emails or writing logs.
    - Single-asset target: Can evaluate a specific equipment ID for isolated testing.
    """
    today = reference_date or date.today()
    settings = get_or_create_reminder_settings(db)

    # Find recipient email for notifications (primary admin or fallback)
    admin_user = db.query(User).filter(User.role == "ADMIN").first()
    default_recipient = admin_user.email if admin_user else "admin@calibtrack.com"

    # Query active equipment with next_calibration_date
    query = db.query(Equipment).filter(Equipment.next_calibration_date.isnot(None))
    if target_equipment_id:
        query = query.filter(Equipment.id == target_equipment_id)
    equipment_items = query.all()

    evaluated_count = len(equipment_items)
    in_app_created = 0
    in_app_skipped = 0
    emails_sent = 0
    emails_failed = 0
    emails_skipped = 0
    details = []

    for eq in equipment_items:
        due_date = eq.next_calibration_date
        if not due_date:
            continue

        days_remaining = (due_date - today).days

        # Determine if equipment qualifies for a reminder
        reminder_type: Optional[str] = None
        if days_remaining < 0:
            reminder_type = "CALIBRATION_OVERDUE"
        elif days_remaining <= settings.reminder_days_before:
            reminder_type = "CALIBRATION_DUE_SOON"
        else:
            # Instrument is still within acceptable calibration window
            continue

        is_overdue = (reminder_type == "CALIBRATION_OVERDUE")
        eq_details = {
            "equipment_id": eq.id,
            "equipment_code": eq.equipment_code,
            "equipment_name": eq.name,
            "department": eq.department or "Laboratory",
            "next_due_date": due_date.isoformat(),
            "days_remaining": days_remaining,
            "reminder_type": reminder_type,
            "is_overdue": is_overdue,
            "in_app_status": "disabled" if not settings.in_app_enabled else "pending",
            "email_status": "disabled" if not settings.email_enabled else "pending",
        }

        # ---------------------------------------------------------------------
        # Channel 1: In-App Notifications
        # ---------------------------------------------------------------------
        if settings.in_app_enabled:
            existing_log = db.query(ReminderLog).filter(
                ReminderLog.equipment_id == eq.id,
                ReminderLog.cycle_due_date == due_date,
                ReminderLog.reminder_type == reminder_type,
                ReminderLog.channel == "IN_APP",
                ReminderLog.status == "SENT",
            ).first()

            if existing_log:
                in_app_skipped += 1
                eq_details["in_app_status"] = "skipped_duplicate"
            elif dry_run:
                in_app_created += 1
                eq_details["in_app_status"] = "dry_run_simulated"
            else:
                try:
                    title = f"Calibration {'Overdue' if is_overdue else 'Due Soon'}: {eq.equipment_code}"
                    msg = (
                        f"Equipment '{eq.name}' ({eq.equipment_code}) in {eq.department or 'Lab'} "
                        f"was due on {due_date.isoformat()} (overdue by {abs(days_remaining)} days)."
                        if is_overdue
                        else f"Equipment '{eq.name}' ({eq.equipment_code}) in {eq.department or 'Lab'} "
                        f"is due on {due_date.isoformat()} ({days_remaining} days remaining)."
                    )

                    notif = Notification(
                        equipment_id=eq.id,
                        user_id=eq.created_by,
                        type=reminder_type,
                        title=title,
                        message=msg,
                        is_read=False,
                    )
                    db.add(notif)

                    log_entry = ReminderLog(
                        equipment_id=eq.id,
                        cycle_due_date=due_date,
                        reminder_type=reminder_type,
                        channel="IN_APP",
                        status="SENT",
                    )
                    db.add(log_entry)
                    db.commit()

                    in_app_created += 1
                    eq_details["in_app_status"] = "created"
                except IntegrityError:
                    db.rollback()
                    in_app_skipped += 1
                    eq_details["in_app_status"] = "skipped_duplicate_concurrent"

        # ---------------------------------------------------------------------
        # Channel 2: Email Notifications (with Safe Retries)
        # ---------------------------------------------------------------------
        if settings.email_enabled:
            # Query existing log for this exact equipment, cycle, and channel
            existing_email_log = db.query(ReminderLog).filter(
                ReminderLog.equipment_id == eq.id,
                ReminderLog.cycle_due_date == due_date,
                ReminderLog.reminder_type == reminder_type,
                ReminderLog.channel == "EMAIL",
            ).first()

            if existing_email_log and existing_email_log.status == "SENT":
                emails_skipped += 1
                eq_details["email_status"] = "skipped_duplicate"
            elif dry_run:
                recipient = default_recipient
                if eq.creator and eq.creator.email:
                    recipient = eq.creator.email
                emails_sent += 1
                eq_details["email_status"] = "dry_run_simulated"
                eq_details["email_recipient"] = recipient
            else:
                recipient = default_recipient
                if eq.creator and eq.creator.email:
                    recipient = eq.creator.email
                eq_details["email_recipient"] = recipient

                # Dispatch email via SMTP service
                success, err_msg = send_calibration_reminder_email(
                    recipient_email=recipient,
                    equipment_code=eq.equipment_code,
                    equipment_name=eq.name,
                    department=eq.department or "General Laboratory",
                    due_date=due_date.isoformat(),
                    days_remaining=days_remaining,
                    is_overdue=is_overdue,
                )

                try:
                    if existing_email_log:
                        # Safely update existing FAILED log on retry without unique constraint violation
                        existing_email_log.status = "SENT" if success else "FAILED"
                        existing_email_log.error_message = err_msg if not success else None
                        existing_email_log.sent_at = datetime.utcnow()
                    else:
                        email_log = ReminderLog(
                            equipment_id=eq.id,
                            cycle_due_date=due_date,
                            reminder_type=reminder_type,
                            channel="EMAIL",
                            status="SENT" if success else "FAILED",
                            error_message=err_msg,
                        )
                        db.add(email_log)

                    db.commit()

                    if success:
                        emails_sent += 1
                        eq_details["email_status"] = "sent"
                    else:
                        emails_failed += 1
                        eq_details["email_status"] = f"failed ({err_msg})"
                except IntegrityError:
                    db.rollback()
                    emails_skipped += 1
                    eq_details["email_status"] = "skipped_duplicate_concurrent"

        details.append(eq_details)

    return {
        "success": True,
        "reference_date": today.isoformat(),
        "dry_run": dry_run,
        "evaluated_equipment_count": evaluated_count,
        "settings": {
            "reminder_days_before": settings.reminder_days_before,
            "email_enabled": settings.email_enabled,
            "in_app_enabled": settings.in_app_enabled,
            "smtp_configured": is_smtp_configured(),
        },
        "in_app_notifications_created": in_app_created,
        "in_app_notifications_skipped": in_app_skipped,
        "emails_sent": emails_sent,
        "emails_failed": emails_failed,
        "emails_skipped": emails_skipped,
        "details": details,
    }
