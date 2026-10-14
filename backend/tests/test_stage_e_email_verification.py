import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.models.user import User
from backend.app.core.security import hash_password
from backend.app.services.email_service import clear_simulated_emails, get_simulated_emails

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

class TestStageEEmailVerification(unittest.TestCase):
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
        clear_simulated_emails()
        db = TestingSessionLocal()
        db.query(User).delete()
        db.commit()
        db.close()

    def test_registration_creates_unverified_account_and_simulates_email(self):
        """Verify registration sets is_email_verified=False and generates verification token."""
        payload = {
            "name": "Dr. Sarah Mitchell",
            "email": "sarah.mitchell@laboratory.com",
            "password": "SecurePassword123!",
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        # Check response metadata
        self.assertFalse(data["is_email_verified"])
        self.assertIn("verify your email", data["message"].lower())
        self.assertIn("user", data)
        self.assertEqual(data["user"]["role"], "TECHNICIAN")

        # In dev mode without live SMTP, simulation data is provided safely
        self.assertIn("simulation", data)
        self.assertIsNotNone(data["simulation"])
        self.assertEqual(data["simulation"]["mode"], "DEVELOPMENT_SIMULATION")
        token = data["simulation"]["verification_token"]
        self.assertTrue(len(token) > 20)

        # Verify stored in database
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "sarah.mitchell@laboratory.com").first()
        self.assertIsNotNone(user)
        self.assertFalse(user.is_email_verified)
        self.assertEqual(user.email_verification_token, token)
        self.assertIsNotNone(user.email_verification_token_expires_at)
        db.close()

    def test_unverified_user_cannot_login(self):
        """Security: Verify unverified staff member is rejected with HTTP 403 upon login."""
        db = TestingSessionLocal()
        unverified_user = User(
            id="usr-unverified-1",
            name="Unverified Tech",
            email="unverified@lab.com",
            password_hash=hash_password("LabPassword123!"),
            role="TECHNICIAN",
            is_email_verified=False,
            email_verification_token="sample-token-12345",
        )
        db.add(unverified_user)
        db.commit()
        db.close()

        res = self.client.post("/api/auth/login", json={
            "email": "unverified@lab.com",
            "password": "LabPassword123!"
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("not been verified", res.json()["detail"].lower())

    def test_email_verification_flow_and_subsequent_login(self):
        """Verify full lifecycle: register -> unverified login fails -> verify token -> login succeeds."""
        # 1. Register
        reg_res = self.client.post("/api/auth/register", json={
            "name": "Alex Vance",
            "email": "alex.vance@lab.com",
            "password": "MyPassword123!"
        })
        self.assertEqual(reg_res.status_code, 201)
        sim = reg_res.json()["simulation"]
        token = sim["verification_token"]

        # 2. Login fails before verification
        login_fail = self.client.post("/api/auth/login", json={
            "email": "alex.vance@lab.com",
            "password": "MyPassword123!"
        })
        self.assertEqual(login_fail.status_code, 403)

        # 3. Verify via POST endpoint
        verify_res = self.client.post("/api/auth/verify-email", json={"token": token})
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.json()["success"])
        self.assertEqual(verify_res.json()["email"], "alex.vance@lab.com")

        # 4. Login now succeeds
        login_success = self.client.post("/api/auth/login", json={
            "email": "alex.vance@lab.com",
            "password": "MyPassword123!"
        })
        self.assertEqual(login_success.status_code, 200)
        self.assertIn("access_token", login_success.json())
        self.assertEqual(login_success.json()["user"]["email"], "alex.vance@lab.com")

    def test_single_use_token_cannot_be_reused(self):
        """Security: Verify token is consumed upon first use and subsequent attempt fails."""
        db = TestingSessionLocal()
        user = User(
            id="usr-single-use",
            name="Single Use Tech",
            email="single@lab.com",
            password_hash=hash_password("Pass1234567!"),
            role="TECHNICIAN",
            is_email_verified=False,
            email_verification_token="valid-token-abcdef12345",
            email_verification_token_expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        db.add(user)
        db.commit()
        db.close()

        # First verification succeeds
        res1 = self.client.post("/api/auth/verify-email", json={"token": "valid-token-abcdef12345"})
        self.assertEqual(res1.status_code, 200)

        # Second verification with same token fails
        res2 = self.client.post("/api/auth/verify-email", json={"token": "valid-token-abcdef12345"})
        self.assertEqual(res2.status_code, 400)
        self.assertIn("invalid or already used", res2.json()["detail"].lower())

    def test_expired_token_rejected(self):
        """Security: Verify expired token (past 24h) returns HTTP 400."""
        db = TestingSessionLocal()
        user = User(
            id="usr-expired-token",
            name="Expired Tech",
            email="expired@lab.com",
            password_hash=hash_password("Pass1234567!"),
            role="TECHNICIAN",
            is_email_verified=False,
            email_verification_token="expired-token-1234567890",
            email_verification_token_expires_at=datetime.utcnow() - timedelta(minutes=5),  # expired 5 min ago
        )
        db.add(user)
        db.commit()
        db.close()

        res = self.client.post("/api/auth/verify-email", json={"token": "expired-token-1234567890"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired", res.json()["detail"].lower())

    def test_get_verify_email_endpoint(self):
        """Verify browser GET link handler /api/auth/verify-email?token=... operates correctly."""
        db = TestingSessionLocal()
        user = User(
            id="usr-get-test",
            name="Get Link User",
            email="getlink@lab.com",
            password_hash=hash_password("Pass1234567!"),
            role="TECHNICIAN",
            is_email_verified=False,
            email_verification_token="url-param-token-1234567",
            email_verification_token_expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        db.add(user)
        db.commit()
        db.close()

        res = self.client.get("/api/auth/verify-email?token=url-param-token-1234567")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

    def test_resend_verification_rate_limiting(self):
        """Security: Verify resend endpoint rate limits duplicate requests within 60 seconds."""
        # 1. Register staff member
        reg_res = self.client.post("/api/auth/register", json={
            "name": "Rate Limited Tech",
            "email": "ratelimit@lab.com",
            "password": "Password123!"
        })
        self.assertEqual(reg_res.status_code, 201)

        # 2. Immediately request resend (within 60 seconds) -> HTTP 429
        resend_fast = self.client.post("/api/auth/resend-verification", json={"email": "ratelimit@lab.com"})
        self.assertEqual(resend_fast.status_code, 429)
        self.assertIn("please wait", resend_fast.json()["detail"].lower())

        # 3. Simulate passage of 65 seconds
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "ratelimit@lab.com").first()
        user.last_verification_email_sent_at = datetime.utcnow() - timedelta(seconds=65)
        db.commit()
        db.close()

        # 4. Now resend succeeds
        resend_ok = self.client.post("/api/auth/resend-verification", json={"email": "ratelimit@lab.com"})
        self.assertEqual(resend_ok.status_code, 200)
        self.assertTrue(resend_ok.json()["success"])
        self.assertIn("simulation", resend_ok.json())

    def test_resend_verification_for_already_verified_account(self):
        """Verify resend endpoint gracefully notifies already verified users without error."""
        db = TestingSessionLocal()
        verified_user = User(
            id="usr-already-ver",
            name="Already Verified",
            email="verified@lab.com",
            password_hash=hash_password("Pass1234567!"),
            role="TECHNICIAN",
            is_email_verified=True,
        )
        db.add(verified_user)
        db.commit()
        db.close()

        res = self.client.post("/api/auth/resend-verification", json={"email": "verified@lab.com"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["already_verified"])

if __name__ == "__main__":
    unittest.main()
