import uuid
import unittest
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.models.user import User
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

class TestStageBAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create tables in test database
        Base.metadata.create_all(bind=test_engine)
        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=test_engine)

    def setUp(self):
        # Seed test admin and technician before each test
        db = TestingSessionLocal()
        db.query(User).delete()

        self.admin_user = User(
            id="admin-uuid-1",
            name="Lab Administrator",
            email="admin@lab-test.com",
            password_hash=hash_password("AdminSecurePass123!"),
            role="ADMIN"
        )
        self.tech_user = User(
            id="tech-uuid-1",
            name="Lab Technician",
            email="tech@lab-test.com",
            password_hash=hash_password("TechSecurePass123!"),
            role="TECHNICIAN"
        )
        db.add(self.admin_user)
        db.add(self.tech_user)
        db.commit()
        db.close()

    def test_registration_forces_technician_role(self):
        """Security: Verify public registration strictly forces TECHNICIAN role even if client requests ADMIN."""
        payload = {
            "name": "Dr. Robert Vance",
            "email": "robert@lab-test.com",
            "password": "StrongPassword123!",
            "role": "ADMIN"  # Attempt to self-grant administrator role
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        # Token and user profile returned
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["name"], "Dr. Robert Vance")
        self.assertEqual(data["user"]["email"], "robert@lab-test.com")
        
        # MUST BE TECHNICIAN!
        self.assertEqual(data["user"]["role"], "TECHNICIAN")
        self.assertNotIn("password_hash", data["user"])

    def test_registration_duplicate_email_rejected(self):
        """Verify registration rejects duplicate email addresses with HTTP 400."""
        payload = {
            "name": "Another Tech",
            "email": "tech@lab-test.com",  # Already exists in setUp
            "password": "Password123!"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("already registered", res.json()["detail"].lower())

    def test_registration_weak_password_rejected(self):
        """Verify registration rejects passwords shorter than 8 characters."""
        payload = {
            "name": "Weak User",
            "email": "weak@lab-test.com",
            "password": "short"  # < 8 chars
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 422)

    def test_login_valid_credentials(self):
        """Verify login issues valid signed JWT token and user profile."""
        res = self.client.post("/api/auth/login", json={
            "email": "admin@lab-test.com",
            "password": "AdminSecurePass123!"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["user"]["role"], "ADMIN")
        self.assertEqual(data["user"]["email"], "admin@lab-test.com")
        self.assertNotIn("password_hash", data["user"])

    def test_login_invalid_password_rejected(self):
        """Verify login with incorrect password returns HTTP 401."""
        res = self.client.post("/api/auth/login", json={
            "email": "admin@lab-test.com",
            "password": "WrongPassword123!"
        })
        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid email address or password", res.json()["detail"])

    def test_login_nonexistent_email_rejected(self):
        """Verify login with unknown email returns HTTP 401."""
        res = self.client.post("/api/auth/login", json={
            "email": "unknown@lab-test.com",
            "password": "AdminSecurePass123!"
        })
        self.assertEqual(res.status_code, 401)

    def test_get_current_user_me_authenticated(self):
        """Verify GET /api/auth/me returns safe profile for valid Bearer token."""
        token_info = create_access_token(
            user_id="tech-uuid-1",
            email="tech@lab-test.com",
            name="Lab Technician",
            role="TECHNICIAN"
        )
        headers = {"Authorization": f"Bearer {token_info['access_token']}"}
        res = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        user_data = res.json()
        self.assertEqual(user_data["id"], "tech-uuid-1")
        self.assertEqual(user_data["email"], "tech@lab-test.com")
        self.assertEqual(user_data["role"], "TECHNICIAN")
        self.assertNotIn("password_hash", user_data)

    def test_get_current_user_me_unauthenticated(self):
        """Verify GET /api/auth/me returns HTTP 401 when Authorization header is missing."""
        res = self.client.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)
        self.assertIn("Authentication required", res.json()["detail"])

    def test_get_current_user_me_expired_token(self):
        """Verify GET /api/auth/me returns HTTP 401 when token is expired."""
        expired_token_info = create_access_token(
            user_id="tech-uuid-1",
            email="tech@lab-test.com",
            name="Lab Technician",
            role="TECHNICIAN",
            expires_delta=timedelta(seconds=-1)
        )
        headers = {"Authorization": f"Bearer {expired_token_info['access_token']}"}
        res = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(res.status_code, 401)
        self.assertIn("expired", res.json()["detail"].lower())

    def test_technician_cannot_promote_users(self):
        """Security: Verify TECHNICIAN attempting PATCH /api/users/{id}/role receives HTTP 403 Forbidden."""
        tech_token = create_access_token(
            user_id="tech-uuid-1",
            email="tech@lab-test.com",
            name="Lab Technician",
            role="TECHNICIAN"
        )["access_token"]

        headers = {"Authorization": f"Bearer {tech_token}"}
        res = self.client.patch("/api/users/tech-uuid-1/role", json={"role": "ADMIN"}, headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Forbidden", res.json()["detail"])

    def test_admin_can_promote_and_demote_user(self):
        """Security: Verify authenticated ADMIN can promote staff to ADMIN and change back to TECHNICIAN."""
        admin_token = create_access_token(
            user_id="admin-uuid-1",
            email="admin@lab-test.com",
            name="Lab Administrator",
            role="ADMIN"
        )["access_token"]

        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Promote technician to ADMIN
        promote_res = self.client.patch("/api/users/tech-uuid-1/role", json={"role": "ADMIN"}, headers=headers)
        self.assertEqual(promote_res.status_code, 200)
        self.assertEqual(promote_res.json()["role"], "ADMIN")

        # Demote back to TECHNICIAN
        demote_res = self.client.patch("/api/users/tech-uuid-1/role", json={"role": "TECHNICIAN"}, headers=headers)
        self.assertEqual(demote_res.status_code, 200)
        self.assertEqual(demote_res.json()["role"], "TECHNICIAN")

    def test_admin_can_list_users(self):
        """Security: Verify authenticated ADMIN can list registered staff."""
        admin_token = create_access_token(
            user_id="admin-uuid-1",
            email="admin@lab-test.com",
            name="Lab Administrator",
            role="ADMIN"
        )["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = self.client.get("/api/users", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)
        self.assertGreaterEqual(len(res.json()), 2)

    def test_technician_cannot_list_users(self):
        """Security: Verify TECHNICIAN is rejected with 403 when listing staff."""
        tech_token = create_access_token(
            user_id="tech-uuid-1",
            email="tech@lab-test.com",
            name="Lab Technician",
            role="TECHNICIAN"
        )["access_token"]
        headers = {"Authorization": f"Bearer {tech_token}"}
        res = self.client.get("/api/users", headers=headers)
        self.assertEqual(res.status_code, 403)

if __name__ == "__main__":
    unittest.main()
