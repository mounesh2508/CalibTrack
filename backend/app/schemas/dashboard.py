from datetime import date
from typing import List, Optional
from pydantic import BaseModel
from backend.app.schemas.calibration import CalibrationRecordResponse

class UpcomingCalibrationItem(BaseModel):
    equipment_id: str
    equipment_code: str
    name: str
    category: str
    next_calibration_date: Optional[date]
    days_remaining: int
    status: str

class DashboardSummaryResponse(BaseModel):
    total_equipment: int
    calibrated_count: int
    due_soon_count: int
    overdue_count: int
    upcoming_calibrations: List[UpcomingCalibrationItem]
    recent_calibration_activity: List[CalibrationRecordResponse]
