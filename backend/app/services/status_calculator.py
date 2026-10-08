from datetime import date, timedelta
from typing import Optional

def calculate_equipment_status(
    next_calibration_date: Optional[date],
    reminder_days_before: int = 7,
    today: Optional[date] = None
) -> str:
    """
    Centralized calibration status calculator for CalibTrack.
    Rules:
      IF today > next_calibration_date:
          status = OVERDUE
      ELSE IF today >= next_calibration_date - reminder_days_before:
          status = DUE_SOON
      ELSE:
          status = CALIBRATED
    """
    if not next_calibration_date:
        return "CALIBRATED"

    if today is None:
        today = date.today()

    if today > next_calibration_date:
        return "OVERDUE"
    elif today >= (next_calibration_date - timedelta(days=reminder_days_before)):
        return "DUE_SOON"
    else:
        return "CALIBRATED"
