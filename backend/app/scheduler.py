import os
import asyncio
from typing import Optional
from backend.app.database import SessionLocal
from backend.app.services.reminder_service import evaluate_and_dispatch_reminders

class CalibrationReminderScheduler:
    """
    Background scheduler for automated calibration due date checks and reminders.
    Safe multi-worker operation: Deduplication is enforced at the database level via
    unique constraints in ReminderLog, preventing duplicate dispatches across workers.
    """
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running: bool = False
        self._interval_seconds: int = int(os.getenv("REMINDER_INTERVAL_SECONDS", "3600"))

    async def _run_loop(self):
        print(f"[Scheduler] Background calibration reminder engine started (interval: {self._interval_seconds}s).")
        # Run an initial evaluation shortly after startup (10 seconds delay)
        await asyncio.sleep(10)

        while self._running:
            try:
                db = SessionLocal()
                try:
                    res = evaluate_and_dispatch_reminders(db)
                    print(
                        f"[Scheduler] Calibration reminders processed: "
                        f"{res['in_app_notifications_created']} in-app created, "
                        f"{res['in_app_notifications_skipped']} duplicates skipped, "
                        f"{res['emails_sent']} emails sent."
                    )
                finally:
                    db.close()
            except Exception as e:
                print(f"[Scheduler Warning] Error during reminder cycle: {type(e).__name__}")

            try:
                await asyncio.sleep(self._interval_seconds)
            except asyncio.CancelledError:
                break

    def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())

    def stop(self):
        if not self._running:
            return
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
        print("[Scheduler] Background reminder engine cleanly stopped.")

scheduler = CalibrationReminderScheduler()
