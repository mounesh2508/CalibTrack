import unittest
from datetime import date, timedelta
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.models.user import User
from backend.app.models.equipment import Equipment
from backend.app.models.notification import Notification
from backend.app.models.reminder_settings import ReminderSettings
from backend.app.models.reminder_log import ReminderLog
from backend.app.core.security import hash_password, create_access_token
from backend.app.services.reminder_service import (
    evaluate_and_dispatch_reminders,
    get_or_create_reminder_settings,
    update_reminder_settings,
)

# Setup test in-memory SQLite database
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

class TestStageFReminderEmails(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)
        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=test_engine)

    def setUp(self):
        db = TestingSessionLocal()
        db.query(ReminderLog).delete()
        db.query(Notification).delete()
        db.query(Equipment).delete()
        db.query(ReminderSettings).delete()
        db.query(User).delete()

        # Seed Admin and Technician
        self.admin = User(
            id="admin-rem-1",
            name="Compliance Officer",
            email="compliance@laboratory.org",
            password_hash=hash_password("AdminPass123!"),
            role="ADMIN",
            is_email_verified=True,
        )
        self.tech = User(
            id="tech-rem-1",
            name="Metrology Tech",
            email="tech@laboratory.org",
            password_hash=hash_password("TechPass123!"),
            role="TECHNICIAN",
            is_email_verified=True,
        )
        db.add_all([self.admin, self.tech])

        # Enable both email and in-app reminders with 7-day window
        settings = ReminderSettings(
            reminder_days_before=7,
            email_enabled=True,
            in_app_enabled=True,
        )
        db.add(settings)

        # Reference test date
        self.ref_date = date(2026, 10, 15)

        # 1. Equipment DUE SOON (due in 4 days, 2026-10-19)
        self.eq_due_soon = Equipment(
            id="eq-ds-01",
            equipment_code="EQ-DUE-SOON-01",
            name="Analytical Balance XPR",
            category="Balances & Scales",
            department="Analytical Chemistry",
            next_calibration_date=date(2026, 10, 19),
            calibration_interval_days=180,
            status="DUE_SOON",
            created_by="tech-rem-1",
        )

        # 2. Equipment OVERDUE (due 8 days ago, 2026-10-07)
        self.eq_overdue = Equipment(
            id="eq-od-01",
            equipment_code="EQ-OVERDUE-01",
            name="Biosafety Cabinet Level II",
            category="Thermal & Environmental",
            department="Microbiology",
            next_calibration_date=date(2026, 10, 7),
            calibration_interval_days=365,
            status="OVERDUE",
            created_by="tech-rem-1",
        )

        # 3. Equipment NOT YET DUE (due in 45 days, 2026-11-29)
        self.eq_future = Equipment(
            id="eq-ft-01",
            equipment_code="EQ-FUTURE-01",
            name="Benchtop Centrifuge 5424R",
            category="Centrifuges",
            department="Biochemistry",
            next_calibration_date=date(2026, 11, 29),
            calibration_interval_days=180,
            status="CALIBRATED",
            created_by="tech-rem-1",
        )

        db.add_all([self.eq_due_soon, self.eq_overdue, self.eq_future])
        db.commit()

        # Generate tokens
        self.admin_token = create_access_token(self.admin.id, self.admin.email, self.admin.name, "ADMIN")["access_token"]
        self.tech_token = create_access_token(self.tech.id, self.tech.email, self.tech.name, "TECHNICIAN")["access_token"]

        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.tech_headers = {"Authorization": f"Bearer {self.tech_token}"}
        db.close()

    @patch("backend.app.services.reminder_service.send_calibration_reminder_email")
    def test_due_soon_and_overdue_generate_emails_future_does_not(self, mock_send_email):
        """Scenario: Due-soon and overdue generate expected reminder emails; not-yet-due does not."""
        mock_send_email.return_value = (True, None)

        db = TestingSessionLocal()
        result = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)

        # Mock email should be called exactly twice: once for due-soon, once for overdue
        self.assertEqual(mock_send_email.call_count, 2)
        self.assertEqual(result["emails_sent"], 2)
        self.assertEqual(result["emails_failed"], 0)

        # Verify arguments passed to email dispatcher
        calls = mock_send_email.call_args_list

        # First call: EQ-DUE-SOON-01 (is_overdue=False, days_remaining=4)
        call_ds = next(c for c in calls if c.kwargs["equipment_code"] == "EQ-DUE-SOON-01")
        self.assertFalse(call_ds.kwargs["is_overdue"])
        self.assertEqual(call_ds.kwargs["days_remaining"], 4)
        self.assertEqual(call_ds.kwargs["recipient_email"], "tech@laboratory.org")

        # Second call: EQ-OVERDUE-01 (is_overdue=True, days_remaining=-8)
        call_od = next(c for c in calls if c.kwargs["equipment_code"] == "EQ-OVERDUE-01")
        self.assertTrue(call_od.kwargs["is_overdue"])
        self.assertEqual(call_od.kwargs["days_remaining"], -8)

        # Verify future equipment was not dispatched
        codes_sent = [c.kwargs["equipment_code"] for c in calls]
        self.assertNotIn("EQ-FUTURE-01", codes_sent)

        # Check database logs
        email_logs = db.query(ReminderLog).filter(ReminderLog.channel == "EMAIL").all()
        self.assertEqual(len(email_logs), 2)
        for log in email_logs:
            self.assertEqual(log.status, "SENT")
            self.assertIsNone(log.error_message)

        db.close()

    @patch("backend.app.services.reminder_service.send_calibration_reminder_email")
    def test_duplicate_scheduler_runs_prevent_duplicate_emails(self, mock_send_email):
        """Scenario: Duplicate scheduler runs do not send duplicate reminder emails."""
        mock_send_email.return_value = (True, None)

        db = TestingSessionLocal()
        # Run 1
        res1 = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        self.assertEqual(res1["emails_sent"], 2)
        self.assertEqual(res1["emails_skipped"], 0)
        self.assertEqual(mock_send_email.call_count, 2)

        # Run 2 on same day (simulating next scheduler cycle)
        mock_send_email.reset_mock()
        res2 = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        self.assertEqual(res2["emails_sent"], 0)
        self.assertEqual(res2["emails_skipped"], 2)
        # Email sender was NOT called on duplicate run
        mock_send_email.assert_not_called()

        # Database still only contains 2 EMAIL logs
        log_count = db.query(ReminderLog).filter(ReminderLog.channel == "EMAIL").count()
        self.assertEqual(log_count, 2)
        db.close()

    @patch("backend.app.services.reminder_service.send_calibration_reminder_email")
    def test_email_delivery_failure_logged_and_retried_safely(self, mock_send_email):
        """Scenario: Delivery failure is logged as FAILED, and subsequent cycle retries safely to SENT."""
        db = TestingSessionLocal()

        # 1. Cycle 1: SMTP server temporary outage -> returns failure
        mock_send_email.return_value = (False, "SMTP connection timed out")
        res1 = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        self.assertEqual(res1["emails_failed"], 2)
        self.assertEqual(res1["emails_sent"], 0)

        # Logs must reflect FAILED status with error message
        logs_fail = db.query(ReminderLog).filter(ReminderLog.channel == "EMAIL").all()
        self.assertEqual(len(logs_fail), 2)
        for l in logs_fail:
            self.assertEqual(l.status, "FAILED")
            self.assertIn("timed out", l.error_message)

        # 2. Cycle 2: SMTP server restored -> retries safely without hitting unique constraint error
        mock_send_email.reset_mock()
        mock_send_email.return_value = (True, None)

        res2 = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        # Should attempt retry on both failed records and succeed
        self.assertEqual(res2["emails_sent"], 2)
        self.assertEqual(res2["emails_failed"], 0)
        self.assertEqual(mock_send_email.call_count, 2)

        # Verify logs were updated to SENT without duplicate rows
        logs_success = db.query(ReminderLog).filter(ReminderLog.channel == "EMAIL").all()
        self.assertEqual(len(logs_success), 2)
        for l in logs_success:
            self.assertEqual(l.status, "SENT")
            self.assertIsNone(l.error_message)

        # 3. Cycle 3: Now already SENT -> skipped
        mock_send_email.reset_mock()
        res3 = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        self.assertEqual(res3["emails_skipped"], 2)
        mock_send_email.assert_not_called()

        db.close()

    def test_dry_run_mode_does_not_modify_database_or_dispatch_emails(self):
        """Scenario: Dry run mode evaluates upcoming and overdue assets without modifying database."""
        db = TestingSessionLocal()
        result = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date, dry_run=True)

        self.assertTrue(result["dry_run"])
        self.assertEqual(result["emails_sent"], 2)
        self.assertEqual(result["in_app_notifications_created"], 2)

        # No notifications or reminder logs should be written in dry run
        self.assertEqual(db.query(Notification).count(), 0)
        self.assertEqual(db.query(ReminderLog).count(), 0)
        db.close()

    @patch("backend.app.routers.reminders.send_calibration_reminder_email")
    def test_admin_test_email_endpoint_security_and_execution(self, mock_send_email):
        """Scenario: Admin can send a single isolated test email; Technicians receive 403."""
        mock_send_email.return_value = (True, None)

        # 1. Technician receives 403 Forbidden
        res_tech = self.client.post("/api/reminders/test-email", headers=self.tech_headers)
        self.assertEqual(res_tech.status_code, 403)
        mock_send_email.assert_not_called()

        # 2. Admin receives 200 OK and sends ONLY to specified target
        res_admin = self.client.post(
            "/api/reminders/test-email",
            json={"recipient_email": "admin-personal@laboratory.org"},
            headers=self.admin_headers,
        )
        self.assertEqual(res_admin.status_code, 200)
        self.assertTrue(res_admin.json()["success"])

        # Verified single call to single recipient
        mock_send_email.assert_called_once()
        self.assertEqual(mock_send_email.call_args.kwargs["recipient_email"], "admin-personal@laboratory.org")

if __name__ == "__main__":
    unittest.main()
