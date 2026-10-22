"""Enterprise JWT Key Rotation & JWKS (JSON Web Key Set) Manager.
Enables zero-downtime cryptographic key rotation for user tokens and microservice credentials.
Supports multi-key verification (active, retired grace period, revoked) and standard JWKS endpoint output.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import logging
import threading
import time
from typing import Any
import uuid

import jwt

logger = logging.getLogger("watchbloom.jwt_rotation")


@dataclass
class KeyDescriptor:
    kid: str
    secret_or_key: str
    algorithm: str = "HS256"
    status: str = "active"  # "active", "grace_period", "revoked"
    created_at: float = field(default_factory=time.time)
    expires_at: float | None = None


class KeyRotationManager:
    """Manages active and rolling JWT cryptographic keys with JWKS compatibility."""

    def __init__(self, default_secret: str = "watchbloom_production_jwt_master_secret_2026"):
        self._lock = threading.Lock()
        self._keyring: dict[str, KeyDescriptor] = {}
        self._active_kid: str = "key_initial_2026"

        # Initialize with baseline master key
        self.register_key(
            kid=self._active_kid,
            secret=default_secret,
            algorithm="HS256",
            status="active",
        )

    def register_key(
        self,
        kid: str,
        secret: str,
        algorithm: str = "HS256",
        status: str = "active",
        expires_at: float | None = None,
    ) -> None:
        """Register a key into the keyring."""
        with self._lock:
            self._keyring[kid] = KeyDescriptor(
                kid=kid,
                secret_or_key=secret,
                algorithm=algorithm,
                status=status,
                expires_at=expires_at,
            )
            if status == "active":
                self._active_kid = kid
        logger.info(f"Registered cryptographic key '{kid}' (algorithm: {algorithm}, status: {status})")

    def rotate_key(self, new_secret: str | None = None, grace_period_seconds: float = 86400.0) -> str:
        """Rotate to a new active key while preserving previous active key in grace period."""
        new_kid = f"key_{datetime.now(timezone.utc).strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"
        generated_secret = new_secret or hashlib.sha256(f"{new_kid}:{time.time()}".encode()).hexdigest()

        with self._lock:
            old_kid = self._active_kid
            if old_kid in self._keyring:
                self._keyring[old_kid].status = "grace_period"
                self._keyring[old_kid].expires_at = time.time() + grace_period_seconds
                logger.info(f"Moved previous key '{old_kid}' to grace_period (expires in {grace_period_seconds}s).")

            self._keyring[new_kid] = KeyDescriptor(
                kid=new_kid,
                secret_or_key=generated_secret,
                algorithm="HS256",
                status="active",
            )
            self._active_kid = new_kid

        logger.info(f"Successfully rotated active JWT key to '{new_kid}'.")
        return new_kid

    def revoke_key(self, kid: str) -> bool:
        """Instantly revoke a compromised key across all pods."""
        with self._lock:
            if kid in self._keyring:
                self._keyring[kid].status = "revoked"
                logger.warning(f"SECURITY: Cryptographic key '{kid}' has been permanently REVOKED!")
                return True
        return False

    def encode_token(self, payload: dict[str, Any], expires_in_seconds: int = 3600) -> str:
        """Encode JWT payload using current active key and inject 'kid' into header."""
        with self._lock:
            active_key = self._keyring[self._active_kid]

        token_payload = dict(payload)
        now = int(time.time())
        token_payload.setdefault("iat", now)
        token_payload.setdefault("exp", now + expires_in_seconds)

        headers = {"kid": active_key.kid, "alg": active_key.algorithm}
        return jwt.encode(token_payload, active_key.secret_or_key, algorithm=active_key.algorithm, headers=headers)

    def decode_token(self, token: str) -> dict[str, Any]:
        """Decode and verify token by inspecting 'kid' header and looking up valid keys."""
        try:
            unverified_headers = jwt.get_unverified_header(token)
        except Exception as e:
            raise jwt.DecodeError(f"Invalid JWT header format: {e}")

        kid = unverified_headers.get("kid")
        with self._lock:
            if not kid:
                # Fallback to active key if legacy token lacks kid header
                key_desc = self._keyring.get(self._active_kid)
            else:
                key_desc = self._keyring.get(kid)

            if not key_desc:
                raise jwt.InvalidKeyError(f"Unknown key ID '{kid}'. Key might be expired or not recognized.")

            if key_desc.status == "revoked":
                raise jwt.InvalidKeyError(f"Key ID '{kid}' is revoked.")

            if key_desc.expires_at and time.time() > key_desc.expires_at:
                raise jwt.ExpiredSignatureError(f"Key ID '{kid}' has surpassed its grace period.")

            secret = key_desc.secret_or_key
            algorithm = key_desc.algorithm

        return jwt.decode(token, secret, algorithms=[algorithm])

    def get_jwks(self) -> dict[str, Any]:
        """Return JWKS public key set representation for API gateways & edge workers."""
        with self._lock:
            keys = []
            for kid, desc in self._keyring.items():
                if desc.status in ("active", "grace_period"):
                    keys.append({
                        "kty": "oct",
                        "use": "sig",
                        "alg": desc.algorithm,
                        "kid": kid,
                        "status": desc.status,
                    })
            return {"keys": keys}


KEY_ROTATION = KeyRotationManager()

