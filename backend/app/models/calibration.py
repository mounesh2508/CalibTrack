import uuid
from datetime import datetime
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class CalibrationRecord(Base):
    __tablename__ = "calibration_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id = Column(String(36), ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False, index=True)
    calibration_date = Column(Date, nullable=False, index=True)
    next_due_date = Column(Date, nullable=False)
    performed_by = Column(String(150), nullable=True)
    calibration_provider = Column(String(150), nullable=True)
    certificate_number = Column(String(100), nullable=True, index=True)
    result = Column(String(50), nullable=False, default="PASSED")  # PASSED, FAILED, CONDITIONAL
    remarks = Column(Text, nullable=True)
    certificate_file_path = Column(String(255), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    equipment = relationship("Equipment", back_populates="calibration_records")
    creator = relationship("User", back_populates="calibrations_created")
