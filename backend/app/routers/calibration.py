from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.calibration import (
    CalibrationRecordCreate,
    CalibrationRecordResponse,
)
from backend.app.services.calibration import (
    get_calibration_records,
    create_calibration_record,
)

router = APIRouter(prefix="/calibration-records", tags=["Calibration"])

@router.get("", response_model=List[CalibrationRecordResponse])
def list_calibration_records(
    equipment_id: Optional[str] = Query(None, description="Filter by equipment ID"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return get_calibration_records(db=db, equipment_id=equipment_id, limit=limit)

@router.post("", response_model=CalibrationRecordResponse, status_code=status.HTTP_201_CREATED)
def log_calibration_record(
    record_in: CalibrationRecordCreate,
    db: Session = Depends(get_db),
):
    return create_calibration_record(db=db, record_in=record_in)
