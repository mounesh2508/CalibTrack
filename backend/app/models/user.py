import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="TECHNICIAN")  # ADMIN, TECHNICIAN
    is_email_verified = Column(Boolean, nullable=False, default=False)
    email_verification_token = Column(String(255), nullable=True, index=True)
    email_verification_token_expires_at = Column(DateTime, nullable=True)
    last_verification_email_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    equipment_created = relationship("Equipment", back_populates="creator")
    calibrations_created = relationship("CalibrationRecord", back_populates="creator")
    notifications = relationship("Notification", back_populates="user")
