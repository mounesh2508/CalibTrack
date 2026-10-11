import os
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt

# -----------------------------------------------------------------------------
# JWT & Environment Configuration
# -----------------------------------------------------------------------------
def get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    is_prod = os.getenv("NODE_ENV") == "production" or os.getenv("ENV") == "production"

    if is_prod:
        if not secret or len(secret) < 32 or "your_super_secret" in secret or "placeholder" in secret:
            raise RuntimeError(
                "[Security Error] In production, JWT_SECRET must be explicitly provided in "
                "environment variables with a strong, unguessable key of at least 32 characters."
            )
        return secret

    # Development fallback with warning if not configured
    if not secret:
        print("[Security Warning] JWT_SECRET is not set in environment. Using development secret.")
        return "calibtrack-dev-jwt-secret-key-32-chars-long-do-not-use-in-prod"
    return secret

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "8"))

# -----------------------------------------------------------------------------
# Password Hashing & Verification (PBKDF2-HMAC-SHA256, 260,000 rounds)
# -----------------------------------------------------------------------------
PBKDF2_ROUNDS = 260000

def hash_password(password: str) -> str:
    """
    Hashes a password with a cryptographically secure 16-byte random salt
    using PBKDF2-HMAC-SHA256 with 260,000 iterations.
    Format: pbkdf2:sha256:260000$<salt_hex>$<hash_hex>
    """
    if not password:
        raise ValueError("Password cannot be empty.")
    
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ROUNDS)
    return f"pbkdf2:sha256:{PBKDF2_ROUNDS}${salt.hex()}${key.hex()}"

def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Verifies a plain-text password against a stored password hash using constant-time comparison.
    Supports PBKDF2-HMAC-SHA256 and legacy seed hashes.
    """
    if not plain_password or not password_hash:
        return False

    try:
        # Standard PBKDF2 format: pbkdf2:sha256:260000$<salt_hex>$<hash_hex>
        if password_hash.startswith("pbkdf2:sha256:"):
            header, salt_hex, key_hex = password_hash.split("$")
            rounds = int(header.split(":")[2])
            salt = bytes.fromhex(salt_hex)
            expected_key = bytes.fromhex(key_hex)
            
            calculated_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, rounds)
            return hmac.compare_digest(calculated_key, expected_key)

        # Legacy SHA256 fallback format: sha256$<salt_hex>$<hash_hex>
        if password_hash.startswith("sha256$"):
            _, salt_hex, key_hex = password_hash.split("$")
            calculated = hashlib.sha256((salt_hex + plain_password).encode("utf-8")).hexdigest()
            return hmac.compare_digest(calculated, key_hex)

        # Seed compatibility fallback: bcrypt-like or mock hashes in dev
        if password_hash.startswith("$2b$") or password_hash.startswith("$2a$"):
            # If bcrypt is available
            try:
                import bcrypt
                return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
            except ImportError:
                return False

        return False
    except Exception as e:
        print(f"[Security Warning] Password verification error: {type(e).__name__}")
        return False

# -----------------------------------------------------------------------------
# JWT Token Creation & Validation
# -----------------------------------------------------------------------------
class TokenExpiredError(Exception):
    pass

class TokenInvalidError(Exception):
    pass

def create_access_token(
    user_id: str,
    email: str,
    name: str,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> Dict[str, Any]:
    """
    Creates an HMAC-SHA256 signed JWT bearer token containing user claims and expiration.
    """
    secret = get_jwt_secret()
    
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
        expire_seconds = int(expires_delta.total_seconds())
    else:
        expire = now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        expire_seconds = ACCESS_TOKEN_EXPIRE_HOURS * 3600

    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }

    token = jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expire_seconds,
        "expires_at": expire.isoformat(),
    }

def verify_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and verifies a JWT token.
    Raises TokenExpiredError if expired, or TokenInvalidError if signature or payload is invalid.
    """
    secret = get_jwt_secret()

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "email", "role", "exp"]}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError("Access token has expired. Please log in again.")
    except (jwt.InvalidTokenError, jwt.DecodeError) as e:
        raise TokenInvalidError(f"Invalid token: {str(e)}")
