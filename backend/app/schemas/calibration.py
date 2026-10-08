from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class CalibrationRecordCreate(BaseModel):
    equipment_id: str
    calibration_date: date
    next_due_date: Optional[date] = None
    performed_by: Optional[str] = None
    calibration_provider: Optional[str] = None
    certificate_number: Optional[str] = None
    result: str = Field(default="PASSED", description="PASSED, FAILED, or CONDITIONAL")
    remarks: Optional[str] = None
    certificate_file_path: Optional[str] = None

class CalibrationRecordResponse(BaseModel):
    id: str
    equipment_id: str
    calibration_date: date
    next_due_date: date
    performed_by: Optional[str] = None
    calibration_provider: Optional[str] = None
    certificate_number: Optional[str] = None
    result: str
    remarks: Optional[str] = None
    certificate_file_path: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CalibrationRecordListResponse(BaseModel):
    total: int
    items: List[CalibrationRecordResponse]
