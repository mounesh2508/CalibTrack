import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from backend.app.database import Base

class ReminderSettings(Base):
    __tablename__ = "reminder_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reminder_days_before = Column(Integer, default=7, nullable=False)
    email_enabled = Column(Boolean, default=True, nullable=False)
    in_app_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
