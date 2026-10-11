import os
import unittest
from datetime import timedelta
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
    TokenExpiredError,
    TokenInvalidError,
    get_jwt_secret,
)
from backend.app.schemas.auth import UserRegister, UserLogin

class TestStageASecurity(unittest.TestCase):
    def test_password_hashing_and_verification(self):
        password = "LaboratorySecurePassword123!"
        hashed = hash_password(password)

        # Check format: pbkdf2:sha256:260000$<salt>$<key>
        self.assertTrue(hashed.startswith("pbkdf2:sha256:260000$"))
        
        # Verify correct password
        self.assertTrue(verify_password(password, hashed))
        
        # Verify incorrect password
        self.assertFalse(verify_password("WrongPassword123!", hashed))
        self.assertFalse(verify_password("", hashed))

    def test_salt_uniqueness(self):
        password = "LaboratorySecurePassword123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        # Hashes must differ because of random salts
        self.assertNotEqual(hash1, hash2)
        self.assertTrue(verify_password(password, hash1))
        self.assertTrue(verify_password(password, hash2))

    def test_token_creation_and_claims(self):
        token_data = create_access_token(
            user_id="usr-12345",
            email="tech@laboratory.com",
            name="Jane Doe",
            role="TECHNICIAN",
            expires_delta=timedelta(hours=1)
        )

        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["token_type"], "bearer")
        self.assertEqual(token_data["expires_in"], 3600)

        # Verify claims
        payload = verify_access_token(token_data["access_token"])
        self.assertEqual(payload["sub"], "usr-12345")
        self.assertEqual(payload["email"], "tech@laboratory.com")
        self.assertEqual(payload["name"], "Jane Doe")
        self.assertEqual(payload["role"], "TECHNICIAN")

    def test_token_tampering_rejected(self):
        token_data = create_access_token(
            user_id="usr-12345",
            email="tech@laboratory.com",
            name="Jane Doe",
            role="TECHNICIAN"
        )
        token = token_data["access_token"]
        
        # Tamper token signature
        tampered_token = token[:-4] + "fake"
        with self.assertRaises(TokenInvalidError):
            verify_access_token(tampered_token)

    def test_expired_token_rejected(self):
        # Create token that expired 10 seconds ago
        expired_token_data = create_access_token(
            user_id="usr-12345",
            email="tech@laboratory.com",
            name="Jane Doe",
            role="TECHNICIAN",
            expires_delta=timedelta(seconds=-10)
        )

        with self.assertRaises(TokenExpiredError):
            verify_access_token(expired_token_data["access_token"])

    def test_production_jwt_secret_enforcement(self):
        original_env = os.environ.get("NODE_ENV")
        original_secret = os.environ.get("JWT_SECRET")

        try:
            # Set to production with weak secret
            os.environ["NODE_ENV"] = "production"
            os.environ["JWT_SECRET"] = "short_weak_key"
            with self.assertRaises(RuntimeError):
                get_jwt_secret()

            # Set strong secret
            os.environ["JWT_SECRET"] = "a" * 32
            self.assertEqual(get_jwt_secret(), "a" * 32)
        finally:
            if original_env:
                os.environ["NODE_ENV"] = original_env
            else:
                os.environ.pop("NODE_ENV", None)
            if original_secret:
                os.environ["JWT_SECRET"] = original_secret
            else:
                os.environ.pop("JWT_SECRET", None)

    def test_auth_schemas_validation(self):
        # Valid registration
        reg = UserRegister(name="Alice Metrologist", email="alice@lab.com", password="Password123!")
        self.assertEqual(reg.name, "Alice Metrologist")
        self.assertEqual(reg.email, "alice@lab.com")

        # Password must be at least 8 chars
        with self.assertRaises(ValueError):
            UserRegister(name="Alice", email="alice@lab.com", password="short")

        # Invalid email
        with self.assertRaises(ValueError):
            UserRegister(name="Alice", email="not-an-email", password="Password123!")

if __name__ == "__main__":
    unittest.main()
