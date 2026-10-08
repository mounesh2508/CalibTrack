from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.equipment import Equipment
from backend.app.models.calibration import CalibrationRecord
from backend.app.schemas.dashboard import DashboardSummaryResponse, UpcomingCalibrationItem
from backend.app.schemas.calibration import CalibrationRecordResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
):
    total = db.query(Equipment).count()
    calibrated = db.query(Equipment).filter(Equipment.status == "CALIBRATED").count()
    due_soon = db.query(Equipment).filter(Equipment.status == "DUE_SOON").count()
    overdue = db.query(Equipment).filter(Equipment.status == "OVERDUE").count()

    today = date.today()

    # Upcoming calibrations (closest next_calibration_date)
    upcoming_equipment = (
        db.query(Equipment)
        .filter(Equipment.next_calibration_date != None)
        .order_by(Equipment.next_calibration_date.asc())
        .limit(10)
        .all()
    )

    upcoming_items = []
    for eq in upcoming_equipment:
        days_rem = (eq.next_calibration_date - today).days if eq.next_calibration_date else 0
        upcoming_items.append(
            UpcomingCalibrationItem(
                equipment_id=eq.id,
                equipment_code=eq.equipment_code,
                name=eq.name,
                category=eq.category,
                next_calibration_date=eq.next_calibration_date,
                days_remaining=days_rem,
                status=eq.status,
            )
        )

    # Recent calibration records
    recent_calibrations = (
        db.query(CalibrationRecord)
        .order_by(CalibrationRecord.calibration_date.desc())
        .limit(6)
        .all()
    )

    return DashboardSummaryResponse(
        total_equipment=total,
        calibrated_count=calibrated,
        due_soon_count=due_soon,
        overdue_count=overdue,
        upcoming_calibrations=upcoming_items,
        recent_calibration_activity=[CalibrationRecordResponse.model_validate(r) for r in recent_calibrations],
    )
