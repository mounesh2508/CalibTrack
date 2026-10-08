import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    manufacturer = Column(String(100), nullable=True)
    model_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True, index=True)
    location = Column(String(150), nullable=True)
    department = Column(String(100), nullable=True)
    purchase_date = Column(Date, nullable=True)
    calibration_interval_days = Column(Integer, nullable=False, default=180)
    last_calibration_date = Column(Date, nullable=True)
    next_calibration_date = Column(Date, nullable=True, index=True)
    status = Column(String(50), nullable=False, default="CALIBRATED", index=True)  # CALIBRATED, DUE_SOON, OVERDUE
    description = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="equipment_created")
    calibration_records = relationship("CalibrationRecord", back_populates="equipment", cascade="all, delete-orphan", order_by="desc(CalibrationRecord.calibration_date)")
    notifications = relationship("Notification", back_populates="equipment", cascade="all, delete-orphan")
