from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    equipment_id: Optional[str] = None
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    items: List[NotificationResponse]
