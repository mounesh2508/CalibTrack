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
from backend.app.models.calibration import CalibrationRecord
from backend.app.core.security import hash_password, create_access_token

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

class TestStageCProtectedEndpoints(unittest.TestCase):
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
        db.query(CalibrationRecord).delete()
        db.query(Equipment).delete()
        db.query(User).delete()

        # Seed Admin & Technician users
        self.admin = User(
            id="admin-id-1",
            name="Admin User",
            email="admin@lab.org",
            password_hash=hash_password("AdminPass123!"),
            role="ADMIN"
        )
        self.technician = User(
            id="tech-id-1",
            name="Technician User",
            email="tech@lab.org",
            password_hash=hash_password("TechPass123!"),
            role="TECHNICIAN"
        )
        db.add(self.admin)
        db.add(self.technician)
        db.commit()

        # Generate tokens
        self.admin_token = create_access_token(self.admin.id, self.admin.email, self.admin.name, "ADMIN")["access_token"]
        self.tech_token = create_access_token(self.technician.id, self.technician.email, self.technician.name, "TECHNICIAN")["access_token"]

        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.tech_headers = {"Authorization": f"Bearer {self.tech_token}"}

        # Seed sample equipment
        self.equipment = Equipment(
            id="eq-test-01",
            equipment_code="EQ-TEST-001",
            name="Test Precision Balance",
            category="Balances & Scales",
            manufacturer="Mettler",
            model_number="XP205",
            serial_number="SN-12345",
            calibration_interval_days=180,
            last_calibration_date=date(2026, 1, 1),
            next_calibration_date=date(2026, 7, 1),
            status="CALIBRATED"
        )
        db.add(self.equipment)
        db.commit()

        # Seed sample calibration record
        self.calibration = CalibrationRecord(
            id="rec-test-01",
            equipment_id="eq-test-01",
            calibration_date=date(2026, 1, 1),
            next_due_date=date(2026, 7, 1),
            performed_by="Tech User",
            calibration_provider="Global Calib Lab",
            certificate_number="CERT-001",
            result="PASSED"
        )
        db.add(self.calibration)
        db.commit()
        db.close()

    # -------------------------------------------------------------------------
    # 1. Equipment Write Protection (POST /api/equipment)
    # -------------------------------------------------------------------------
    def test_create_equipment_unauthenticated(self):
        """Verify unauthenticated POST /api/equipment returns HTTP 401."""
        payload = {
            "equipment_code": "EQ-NEW-01",
            "name": "New Centrifuge",
            "category": "Centrifuges",
            "calibration_interval_days": 90
        }
        res = self.client.post("/api/equipment", json=payload)
        self.assertEqual(res.status_code, 401)
        self.assertIn("Authentication required", res.json()["detail"])

    def test_create_equipment_invalid_token(self):
        """Verify POST /api/equipment with invalid token returns HTTP 401."""
        payload = {
            "equipment_code": "EQ-NEW-02",
            "name": "New Centrifuge",
            "category": "Centrifuges",
            "calibration_interval_days": 90
        }
        headers = {"Authorization": "Bearer invalid.jwt.token"}
        res = self.client.post("/api/equipment", json=payload, headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_create_equipment_technician_allowed(self):
        """Verify authenticated TECHNICIAN can register new equipment."""
        payload = {
            "equipment_code": "EQ-TECH-01",
            "name": "Benchtop pH Meter",
            "category": "Electrochemistry",
            "calibration_interval_days": 180
        }
        res = self.client.post("/api/equipment", json=payload, headers=self.tech_headers)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["equipment_code"], "EQ-TECH-01")

    def test_create_equipment_admin_allowed(self):
        """Verify authenticated ADMIN can register new equipment."""
        payload = {
            "equipment_code": "EQ-ADMIN-01",
            "name": "HPLC System",
            "category": "Chromatography",
            "calibration_interval_days": 365
        }
        res = self.client.post("/api/equipment", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["equipment_code"], "EQ-ADMIN-01")

    # -------------------------------------------------------------------------
    # 2. Equipment Update Protection (PUT /api/equipment/{id})
    # -------------------------------------------------------------------------
    def test_update_equipment_unauthenticated(self):
        """Verify unauthenticated PUT /api/equipment/{id} returns HTTP 401."""
        res = self.client.put("/api/equipment/eq-test-01", json={"location": "Lab 4A"})
        self.assertEqual(res.status_code, 401)

    def test_update_equipment_technician_allowed(self):
        """Verify authenticated TECHNICIAN can update equipment metadata."""
        res = self.client.put("/api/equipment/eq-test-01", json={"location": "Lab 2B"}, headers=self.tech_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["location"], "Lab 2B")

    def test_update_equipment_missing_record_returns_404(self):
        """Verify PUT /api/equipment on non-existent ID returns HTTP 404."""
        res = self.client.put("/api/equipment/non-existent-id", json={"location": "Lab 99"}, headers=self.tech_headers)
        self.assertEqual(res.status_code, 404)

    # -------------------------------------------------------------------------
    # 3. Equipment Delete RBAC (DELETE /api/equipment/{id})
    # -------------------------------------------------------------------------
    def test_delete_equipment_unauthenticated(self):
        """Verify unauthenticated DELETE /api/equipment/{id} returns HTTP 401."""
        res = self.client.delete("/api/equipment/eq-test-01")
        self.assertEqual(res.status_code, 401)

    def test_delete_equipment_technician_forbidden(self):
        """Security: Verify TECHNICIAN attempting to delete equipment receives HTTP 403 Forbidden."""
        res = self.client.delete("/api/equipment/eq-test-01", headers=self.tech_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Forbidden", res.json()["detail"])

    def test_delete_equipment_admin_allowed(self):
        """Security: Verify ADMIN can delete equipment."""
        res = self.client.delete("/api/equipment/eq-test-01", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

    def test_delete_equipment_missing_returns_404(self):
        """Verify DELETE on non-existent ID by ADMIN returns HTTP 404."""
        res = self.client.delete("/api/equipment/non-existent-id", headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    # -------------------------------------------------------------------------
    # 4. Calibration Write Protection (POST /api/calibration-records)
    # -------------------------------------------------------------------------
    def test_log_calibration_unauthenticated(self):
        """Verify unauthenticated POST /api/calibration-records returns HTTP 401."""
        payload = {
            "equipment_id": "eq-test-01",
            "calibration_date": "2026-10-11",
            "result": "PASSED"
        }
        res = self.client.post("/api/calibration-records", json=payload)
        self.assertEqual(res.status_code, 401)

    def test_log_calibration_technician_allowed(self):
        """Verify authenticated TECHNICIAN can log a calibration record."""
        payload = {
            "equipment_id": "eq-test-01",
            "calibration_date": "2026-10-11",
            "performed_by": "Dr. Sarah",
            "calibration_provider": "Precision Metrology",
            "certificate_number": "CERT-2026-991",
            "result": "PASSED"
        }
        res = self.client.post("/api/calibration-records", json=payload, headers=self.tech_headers)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["certificate_number"], "CERT-2026-991")

    def test_log_calibration_invalid_equipment_relationship(self):
        """Verify logging calibration for non-existent equipment returns HTTP 404."""
        payload = {
            "equipment_id": "invalid-eq-id-999",
            "calibration_date": "2026-10-11",
            "result": "PASSED"
        }
        res = self.client.post("/api/calibration-records", json=payload, headers=self.tech_headers)
        self.assertEqual(res.status_code, 404)
        self.assertIn("does not exist", res.json()["detail"])

    # -------------------------------------------------------------------------
    # 5. Calibration Delete RBAC (DELETE /api/calibration-records/{id})
    # -------------------------------------------------------------------------
    def test_delete_calibration_unauthenticated(self):
        """Verify unauthenticated DELETE /api/calibration-records/{id} returns HTTP 401."""
        res = self.client.delete("/api/calibration-records/rec-test-01")
        self.assertEqual(res.status_code, 401)

    def test_delete_calibration_technician_forbidden(self):
        """Security: Verify TECHNICIAN attempting to delete calibration log receives HTTP 403 Forbidden."""
        res = self.client.delete("/api/calibration-records/rec-test-01", headers=self.tech_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Forbidden", res.json()["detail"])

    def test_delete_calibration_admin_allowed(self):
        """Security: Verify ADMIN can delete calibration record."""
        res = self.client.delete("/api/calibration-records/rec-test-01", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

    def test_delete_calibration_missing_returns_404(self):
        """Verify DELETE on non-existent calibration ID by ADMIN returns HTTP 404."""
        res = self.client.delete("/api/calibration-records/non-existent-rec", headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    # -------------------------------------------------------------------------
    # 6. Public Read Operations Compatibility
    # -------------------------------------------------------------------------
    def test_read_operations_remain_accessible(self):
        """Verify read operations remain accessible for dashboard and equipment registry."""
        res_list = self.client.get("/api/equipment")
        self.assertEqual(res_list.status_code, 200)

        res_single = self.client.get("/api/equipment/eq-test-01")
        self.assertEqual(res_single.status_code, 200)

        res_calib = self.client.get("/api/calibration-records")
        self.assertEqual(res_calib.status_code, 200)

if __name__ == "__main__":
    unittest.main()
