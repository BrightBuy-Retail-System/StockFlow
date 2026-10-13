import time
import random
import threading
from typing import Optional, Dict, Tuple

# Thread-safe in-memory OTP store with automatic expiration
_otp_store: Dict[str, Dict] = {}
_lock = threading.Lock()

OTP_EXPIRY_SECONDS = 600  # 10 minutes


def _make_key(email: str, purpose: str) -> str:
    return f"{purpose.strip().lower()}:{email.strip().lower()}"


def generate_otp(email: str, purpose: str = "register") -> str:
    """
    Generates a secure 6-digit numeric OTP and stores it with an expiration timestamp.
    """
    code = f"{random.randint(100000, 999999)}"
    key = _make_key(email, purpose)
    now = time.time()

    with _lock:
        # Cleanup expired keys
        expired = [k for k, v in _otp_store.items() if v.get("expires_at", 0) < now]
        for k in expired:
            _otp_store.pop(k, None)

        _otp_store[key] = {
            "code": code,
            "expires_at": now + OTP_EXPIRY_SECONDS,
            "attempts": 0,
            "created_at": now,
        }

    return code


def verify_otp(email: str, code: str, purpose: str = "register") -> Tuple[bool, str]:
    """
    Validates a submitted OTP. Returns (is_valid: bool, error_message: str).
    Invalidates the OTP immediately upon successful verification.
    """
    key = _make_key(email, purpose)
    now = time.time()

    with _lock:
        record = _otp_store.get(key)
        if not record:
            return False, "OTP has expired or was not requested. Please request a new code."

        if now > record["expires_at"]:
            _otp_store.pop(key, None)
            return False, "OTP has expired. Please request a new code."

        record["attempts"] += 1
        if record["attempts"] > 5:
            _otp_store.pop(key, None)
            return False, "Too many failed attempts. Please request a new OTP."

        if str(record["code"]).strip() == str(code).strip():
            # Invalidate immediately so OTP cannot be re-used
            _otp_store.pop(key, None)
            return True, "OTP verified successfully."

        return False, "Invalid OTP code. Please check and try again."


def clear_otp(email: str, purpose: str = "register"):
    """Manually invalidates any stored OTP."""
    key = _make_key(email, purpose)
    with _lock:
        _otp_store.pop(key, None)
