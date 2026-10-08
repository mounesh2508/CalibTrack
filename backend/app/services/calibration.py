from datetime import timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models.calibration import CalibrationRecord
from backend.app.models.equipment import Equipment
from backend.app.models.notification import Notification
from backend.app.schemas.calibration import CalibrationRecordCreate
from backend.app.services.status_calculator import calculate_equipment_status

def get_calibration_records(
    db: Session,
    equipment_id: Optional[str] = None,
    limit: int = 100
) -> List[CalibrationRecord]:
    query = db.query(CalibrationRecord)
    if equipment_id:
        query = query.filter(CalibrationRecord.equipment_id == equipment_id)
    return query.order_by(CalibrationRecord.calibration_date.desc()).limit(limit).all()

def create_calibration_record(
    db: Session,
    record_in: CalibrationRecordCreate
) -> CalibrationRecord:
    # 1. Validate equipment exists
    equipment = db.query(Equipment).filter(Equipment.id == record_in.equipment_id).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment with ID '{record_in.equipment_id}' does not exist."
        )

    # 2. Compute next_due_date if not provided
    next_due = record_in.next_due_date
    if not next_due:
        next_due = record_in.calibration_date + timedelta(days=equipment.calibration_interval_days)

    # 3. Create calibration record
    db_record = CalibrationRecord(
        equipment_id=equipment.id,
        calibration_date=record_in.calibration_date,
        next_due_date=next_due,
        performed_by=record_in.performed_by,
        calibration_provider=record_in.calibration_provider,
        certificate_number=record_in.certificate_number,
        result=record_in.result.upper(),
        remarks=record_in.remarks,
        certificate_file_path=record_in.certificate_file_path,
    )
    db.add(db_record)

    # 4. Update equipment dates and recalculate status
    equipment.last_calibration_date = record_in.calibration_date
    equipment.next_calibration_date = next_due

    if record_in.result.upper() == "FAILED":
        equipment.status = "OVERDUE"
    else:
        equipment.status = calculate_equipment_status(next_due)

    # 5. Automatically create a notification
    notification = Notification(
        equipment_id=equipment.id,
        type="CALIBRATION_COMPLETED" if record_in.result.upper() != "FAILED" else "CALIBRATION_OVERDUE",
        title="Calibration Logged",
        message=f"{equipment.name} ({equipment.equipment_code}) calibrated with outcome: {record_in.result.upper()}.",
        is_read=False,
    )
    db.add(notification)

    db.commit()
    db.refresh(db_record)
    return db_record
