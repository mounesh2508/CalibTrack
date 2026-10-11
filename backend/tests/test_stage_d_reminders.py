import unittest
from datetime import date, timedelta
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
from backend.app.services.email_service import is_smtp_configured

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

class TestStageDReminders(unittest.TestCase):
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

        # Seed Users
        self.admin = User(
            id="usr-admin-1",
            name="Admin Officer",
            email="admin@lab.org",
            password_hash=hash_password("AdminPass123!"),
            role="ADMIN"
        )
        self.tech = User(
            id="usr-tech-1",
            name="Lab Technician",
            email="tech@lab.org",
            password_hash=hash_password("TechPass123!"),
            role="TECHNICIAN"
        )
        db.add(self.admin)
        db.add(self.tech)

        # Base Reference Date: 2026-10-15
        self.ref_date = date(2026, 10, 15)

        # 1. Upcoming equipment: due in 5 days (2026-10-20) -> within 7 days window
        self.eq_upcoming = Equipment(
            id="eq-upcoming-1",
            equipment_code="EQ-UPCOMING",
            name="Upcoming Pipette",
            category="Balances & Scales",
            next_calibration_date=date(2026, 10, 20),
            calibration_interval_days=90,
            status="DUE_SOON"
        )

        # 2. Due today equipment: due on 2026-10-15
        self.eq_today = Equipment(
            id="eq-today-1",
            equipment_code="EQ-TODAY",
            name="Due Today Spectrophotometer",
            category="Spectroscopy",
            next_calibration_date=date(2026, 10, 15),
            calibration_interval_days=180,
            status="DUE_SOON"
        )

        # 3. Overdue equipment: due 10 days ago (2026-10-05)
        self.eq_overdue = Equipment(
            id="eq-overdue-1",
            equipment_code="EQ-OVERDUE",
            name="Overdue Biosafety Cabinet",
            category="Thermal & Environmental",
            next_calibration_date=date(2026, 10, 5),
            calibration_interval_days=180,
            status="OVERDUE"
        )

        # 4. Not yet due equipment: due in 60 days (2026-12-14)
        self.eq_future = Equipment(
            id="eq-future-1",
            equipment_code="EQ-FUTURE",
            name="Future Autoclave",
            category="Sterilization",
            next_calibration_date=date(2026, 12, 14),
            calibration_interval_days=365,
            status="CALIBRATED"
        )

        # 5. Missing date equipment: next_calibration_date is None
        self.eq_nodate = Equipment(
            id="eq-nodate-1",
            equipment_code="EQ-NODATE",
            name="Uncommissioned Meter",
            category="Electrochemistry",
            next_calibration_date=None,
            calibration_interval_days=180,
            status="CALIBRATED"
        )

        db.add_all([self.eq_upcoming, self.eq_today, self.eq_overdue, self.eq_future, self.eq_nodate])
        db.commit()

        # Auth tokens
        self.admin_token = create_access_token(self.admin.id, self.admin.email, self.admin.name, "ADMIN")["access_token"]
        self.tech_token = create_access_token(self.tech.id, self.tech.email, self.tech.name, "TECHNICIAN")["access_token"]

        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.tech_headers = {"Authorization": f"Bearer {self.tech_token}"}
        db.close()

    def test_reminder_calculation_identifies_due_and_overdue(self):
        """Verify reminder engine flags upcoming, due-today, and overdue assets while ignoring future and null dates."""
        db = TestingSessionLocal()
        result = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)

        # Should create in-app notifications for: eq_upcoming, eq_today, eq_overdue (3 total)
        self.assertEqual(result["in_app_notifications_created"], 3)
        self.assertEqual(result["in_app_notifications_skipped"], 0)

        # Verify notifications in database
        notifs = db.query(Notification).all()
        self.assertEqual(len(notifs), 3)

        notif_types = {n.type for n in notifs}
        self.assertIn("CALIBRATION_DUE_SOON", notif_types)
        self.assertIn("CALIBRATION_OVERDUE", notif_types)

        # Verify future asset and nodate asset did not get notifications
        future_notif = db.query(Notification).filter(Notification.equipment_id == "eq-future-1").first()
        self.assertIsNone(future_notif)

        nodate_notif = db.query(Notification).filter(Notification.equipment_id == "eq-nodate-1").first()
        self.assertIsNone(nodate_notif)
        db.close()

    def test_durable_deduplication_prevents_duplicate_reminders(self):
        """Verify executing the reminder cycle twice does not create duplicate notifications."""
        db = TestingSessionLocal()
        # Run 1
        res1 = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        self.assertEqual(res1["in_app_notifications_created"], 3)

        # Run 2 on same day
        res2 = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        self.assertEqual(res2["in_app_notifications_created"], 0)
        self.assertEqual(res2["in_app_notifications_skipped"], 3)

        # Ensure database still only has 3 notifications, not 6
        notif_count = db.query(Notification).count()
        self.assertEqual(notif_count, 3)

        # Verify 3 entries in ReminderLog
        log_count = db.query(ReminderLog).filter(ReminderLog.channel == "IN_APP", ReminderLog.status == "SENT").count()
        self.assertEqual(log_count, 3)
        db.close()

    def test_disabled_in_app_channel(self):
        """Verify disabling in_app_enabled prevents creating in-app notifications."""
        db = TestingSessionLocal()
        update_reminder_settings(db, in_app_enabled=False)

        res = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        self.assertEqual(res["in_app_notifications_created"], 0)
        self.assertEqual(db.query(Notification).count(), 0)
        db.close()

    def test_disabled_email_channel(self):
        """Verify disabling email_enabled skips email evaluation."""
        db = TestingSessionLocal()
        update_reminder_settings(db, email_enabled=False)

        res = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        self.assertEqual(res["emails_sent"], 0)
        self.assertEqual(res["emails_failed"], 0)
        db.close()

    def test_unconfigured_smtp_graceful_handling(self):
        """Verify unconfigured SMTP logs failure gracefully without crashing or halting in-app alerts."""
        db = TestingSessionLocal()
        update_reminder_settings(db, email_enabled=True, in_app_enabled=True)

        # If SMTP is unconfigured in test environment:
        res = evaluate_and_dispatch_reminders(db, reference_date=self.ref_date)
        self.assertEqual(res["in_app_notifications_created"], 3)
        
        # Email logs recorded as failed (not blocking future retry if SMTP is added)
        email_logs = db.query(ReminderLog).filter(ReminderLog.channel == "EMAIL").all()
        for l in email_logs:
            self.assertEqual(l.status, "FAILED")
            self.assertIn("SMTP", l.error_message)
        db.close()

    def test_reminder_settings_get_endpoint(self):
        """Verify GET /api/reminders/settings requires staff authentication."""
        # Unauthenticated -> 401
        res_unauth = self.client.get("/api/reminders/settings")
        self.assertEqual(res_unauth.status_code, 401)

        # Technician -> 200
        res_tech = self.client.get("/api/reminders/settings", headers=self.tech_headers)
        self.assertEqual(res_tech.status_code, 200)
        data = res_tech.json()
        self.assertIn("reminder_days_before", data)
        self.assertIn("email_enabled", data)
        self.assertIn("in_app_enabled", data)
        self.assertIn("smtp_configured", data)

    def test_reminder_settings_update_endpoint_rbac(self):
        """Security: Verify updating reminder settings requires ADMIN; TECHNICIAN receives 403."""
        # Technician -> 403 Forbidden
        res_tech = self.client.put("/api/reminders/settings", json={"reminder_days_before": 14}, headers=self.tech_headers)
        self.assertEqual(res_tech.status_code, 403)

        # Admin -> 200 OK
        res_admin = self.client.put("/api/reminders/settings", json={"reminder_days_before": 14}, headers=self.admin_headers)
        self.assertEqual(res_admin.status_code, 200)
        self.assertEqual(res_admin.json()["reminder_days_before"], 14)

    def test_reminder_trigger_endpoint_protected(self):
        """Security: Verify manual trigger endpoint is protected against unauthenticated calls."""
        # Unauthenticated -> 401
        res_unauth = self.client.post("/api/reminders/trigger")
        self.assertEqual(res_unauth.status_code, 401)

        # Authenticated Staff -> 200 OK
        res_staff = self.client.post("/api/reminders/trigger", headers=self.tech_headers)
        self.assertEqual(res_staff.status_code, 200)
        self.assertTrue(res_staff.json()["success"])

if __name__ == "__main__":
    unittest.main()
