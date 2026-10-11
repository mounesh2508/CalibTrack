from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.equipment import (
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentResponse,
    EquipmentListResponse,
)
from backend.app.schemas.calibration import CalibrationRecordResponse
from backend.app.services.equipment import (
    get_equipment_list,
    get_equipment_by_id,
    create_equipment,
    update_equipment,
    delete_equipment,
)
from backend.app.services.calibration import get_calibration_records
from backend.app.models.user import User
from backend.app.dependencies import require_staff, require_admin

router = APIRouter(prefix="/equipment", tags=["Equipment"])

@router.get("", response_model=EquipmentListResponse)
def list_equipment(
    search: Optional[str] = Query(None, description="Search by name, code, manufacturer, serial"),
    status: Optional[str] = Query(None, description="CALIBRATED, DUE_SOON, OVERDUE, or ALL"),
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("next_calibration_date", description="Field to sort by"),
    sort_order: str = Query("asc", description="asc or desc"),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    items, total = get_equipment_list(
        db=db,
        skip=skip,
        limit=page_size,
        search=search,
        status_filter=status,
        category_filter=category,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }

@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_new_equipment(
    equip_in: EquipmentCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """
    Registers new laboratory equipment.
    SECURITY: Requires authenticated staff (TECHNICIAN or ADMIN).
    """
    return create_equipment(db, equip_in, user_id=current_user.id)

@router.get("/{equipment_id}", response_model=EquipmentResponse)
def get_single_equipment(
    equipment_id: str,
    db: Session = Depends(get_db),
):
    item = get_equipment_by_id(db, equipment_id)
    if not item:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment '{equipment_id}' not found."
        )
    return item

@router.put("/{equipment_id}", response_model=EquipmentResponse)
def update_existing_equipment(
    equipment_id: str,
    equip_in: EquipmentUpdate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """
    Updates existing equipment details.
    SECURITY: Requires authenticated staff (TECHNICIAN or ADMIN).
    """
    return update_equipment(db, equipment_id, equip_in)

@router.delete("/{equipment_id}", status_code=status.HTTP_200_OK)
def delete_existing_equipment(
    equipment_id: str,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Deletes an equipment item and cascades all associated calibration logs.
    SECURITY: Strictly requires ADMIN role. TECHNICIAN users are rejected with 403.
    """
    delete_equipment(db, equipment_id)
    return {"success": True, "message": f"Equipment '{equipment_id}' deleted successfully."}

@router.get("/{equipment_id}/calibration-records", response_model=List[CalibrationRecordResponse])
def get_equipment_calibration_history(
    equipment_id: str,
    limit: int = Query(50, ge=1),
    db: Session = Depends(get_db),
):
    return get_calibration_records(db, equipment_id=equipment_id, limit=limit)
