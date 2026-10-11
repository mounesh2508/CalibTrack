from datetime import date, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from fastapi import HTTPException, status
from backend.app.models.equipment import Equipment
from backend.app.schemas.equipment import EquipmentCreate, EquipmentUpdate
from backend.app.services.status_calculator import calculate_equipment_status

def get_equipment_list(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    sort_by: str = "next_calibration_date",
    sort_order: str = "asc",
) -> Tuple[List[Equipment], int]:
    query = db.query(Equipment)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Equipment.name.ilike(search_fmt),
                Equipment.equipment_code.ilike(search_fmt),
                Equipment.manufacturer.ilike(search_fmt),
                Equipment.model_number.ilike(search_fmt),
                Equipment.serial_number.ilike(search_fmt),
            )
        )

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(Equipment.status == status_filter.upper())

    if category_filter and category_filter.upper() != "ALL":
        query = query.filter(Equipment.category == category_filter)

    total = query.count()

    # Dynamic sorting
    sort_column = getattr(Equipment, sort_by, Equipment.next_calibration_date)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    items = query.offset(skip).limit(limit).all()
    return items, total

def get_equipment_by_id(db: Session, equipment_id: str) -> Optional[Equipment]:
    return db.query(Equipment).filter(
        or_(Equipment.id == equipment_id, Equipment.equipment_code == equipment_id)
    ).first()

def create_equipment(db: Session, equip_in: EquipmentCreate, user_id: Optional[str] = None) -> Equipment:
    # Check duplicate code
    existing = db.query(Equipment).filter(Equipment.equipment_code == equip_in.equipment_code.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Equipment with code '{equip_in.equipment_code}' already exists."
        )

    # Calculate next_calibration_date & status
    next_calib_date = None
    calculated_status = "CALIBRATED"

    if equip_in.last_calibration_date:
        next_calib_date = equip_in.last_calibration_date + timedelta(days=equip_in.calibration_interval_days)
        calculated_status = calculate_equipment_status(next_calib_date)

    db_item = Equipment(
        equipment_code=equip_in.equipment_code.strip(),
        name=equip_in.name.strip(),
        category=equip_in.category.strip(),
        manufacturer=equip_in.manufacturer,
        model_number=equip_in.model_number,
        serial_number=equip_in.serial_number,
        location=equip_in.location,
        department=equip_in.department,
        purchase_date=equip_in.purchase_date,
        calibration_interval_days=equip_in.calibration_interval_days,
        last_calibration_date=equip_in.last_calibration_date,
        next_calibration_date=next_calib_date,
        status=calculated_status,
        description=equip_in.description,
        created_by=user_id,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_equipment(db: Session, equipment_id: str, equip_in: EquipmentUpdate) -> Equipment:
    db_item = get_equipment_by_id(db, equipment_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment '{equipment_id}' not found."
        )

    update_data = equip_in.model_dump(exclude_unset=True)

    # If equipment_code is changed, ensure uniqueness
    if "equipment_code" in update_data and update_data["equipment_code"] != db_item.equipment_code:
        existing = db.query(Equipment).filter(Equipment.equipment_code == update_data["equipment_code"]).first()
        if existing and existing.id != db_item.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Equipment code '{update_data['equipment_code']}' is already in use."
            )

    for field, value in update_data.items():
        setattr(db_item, field, value)

    # Recalculate status if dates or interval changed
    if db_item.next_calibration_date:
        db_item.status = calculate_equipment_status(db_item.next_calibration_date)

    db.commit()
    db.refresh(db_item)
    return db_item

def delete_equipment(db: Session, equipment_id: str) -> bool:
    db_item = get_equipment_by_id(db, equipment_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment '{equipment_id}' not found."
        )
    db.delete(db_item)
    db.commit()
    return True
