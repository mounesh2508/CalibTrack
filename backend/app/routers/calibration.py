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
    delete_calibration_record,
)
from backend.app.models.user import User
from backend.app.dependencies import require_staff, require_admin

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
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """
    Logs an accredited calibration record and updates equipment next calibration schedule.
    SECURITY: Requires authenticated staff (TECHNICIAN or ADMIN).
    """
    return create_calibration_record(db=db, record_in=record_in, user_id=current_user.id)

@router.delete("/{record_id}", status_code=status.HTTP_200_OK)
def remove_calibration_record(
    record_id: str,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Deletes a calibration record.
    SECURITY: Strictly requires ADMIN role. TECHNICIAN users are rejected with 403.
    """
    delete_calibration_record(db=db, record_id=record_id)
    return {"success": True, "message": f"Calibration record '{record_id}' deleted successfully."}
