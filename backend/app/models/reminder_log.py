import uuid
from datetime import datetime
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ReminderLog(Base):
    """
    Durable record of dispatched calibration reminders.
    Ensures multi-worker deduplication by enforcing a database-level uniqueness constraint
    on (equipment_id, cycle_due_date, reminder_type, channel).
    """
    __tablename__ = "reminder_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id = Column(String(36), ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False, index=True)
    cycle_due_date = Column(Date, nullable=False, index=True)
    reminder_type = Column(String(50), nullable=False)  # CALIBRATION_DUE_SOON, CALIBRATION_OVERDUE
    channel = Column(String(20), nullable=False)        # IN_APP, EMAIL
    status = Column(String(20), nullable=False, default="SENT")  # SENT, FAILED
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "equipment_id", "cycle_due_date", "reminder_type", "channel",
            name="uq_reminder_log_dedup"
        ),
    )

    # Relationships
    equipment = relationship("Equipment")
