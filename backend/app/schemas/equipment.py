from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class EquipmentBase(BaseModel):
    equipment_code: str = Field(..., description="Unique equipment code (e.g. EQ-2024-001)")
    name: str = Field(..., description="Name of the laboratory instrument")
    category: str = Field(..., description="Equipment category (e.g. Balances & Scales, Spectroscopy)")
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    department: Optional[str] = None
    purchase_date: Optional[date] = None
    calibration_interval_days: int = Field(default=180, ge=1, description="Interval between calibrations in days")
    last_calibration_date: Optional[date] = None
    description: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    equipment_code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    department: Optional[str] = None
    purchase_date: Optional[date] = None
    calibration_interval_days: Optional[int] = Field(None, ge=1)
    last_calibration_date: Optional[date] = None
    next_calibration_date: Optional[date] = None
    status: Optional[str] = None
    description: Optional[str] = None

class EquipmentResponse(EquipmentBase):
    id: str
    next_calibration_date: Optional[date] = None
    status: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EquipmentListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[EquipmentResponse]
