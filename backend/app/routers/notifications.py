from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.notification import Notification
from backend.app.schemas.notification import NotificationResponse, NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=NotificationListResponse)
def list_notifications(
    db: Session = Depends(get_db),
):
    items = db.query(Notification).order_by(Notification.created_at.desc()).limit(100).all()
    unread_count = db.query(Notification).filter(Notification.is_read == False).count()
    return {
        "total": len(items),
        "unread_count": unread_count,
        "items": items,
    }

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{notification_id}' not found."
        )
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif
