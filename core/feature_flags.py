"""Production-Grade Feature Flag & Canary Release Engine for Watchbloom.
Supports percentage-based rollouts (0-100%), consistent user bucketing via MurmurHash/MD5,
role-based overrides, and real-time remote kill switches backed by Redis.
"""

from dataclasses import dataclass, field
import hashlib
import json
import logging
import threading
import time
from typing import Any

from core.cache import CACHE

logger = logging.getLogger("watchbloom.feature_flags")


@dataclass
class FeatureRule:
    name: str
    enabled: bool = False
    rollout_percentage: int = 0  # 0 to 100%
    allowed_roles: list[str] = field(default_factory=list)
    allowed_users: list[str] = field(default_factory=list)
    description: str = ""


class FeatureFlagEngine:
    """Evaluates dynamic runtime feature flags and canary experiment allocations."""

    def __init__(self):
        self._local_rules: dict[str, FeatureRule] = {}
        self._lock = threading.Lock()
        self._last_sync_time = 0.0
        self._sync_interval_seconds = 10.0

        # Default system feature flags for Watchbloom YouTube-scale deployment
        self._register_default_flags()

    def _register_default_flags(self) -> None:
        defaults = [
            FeatureRule(
                name="av1_dual_codec_streaming",
                enabled=True,
                rollout_percentage=50,
                description="Stream AV1 codec with H.264 fallback for compatible browsers",
            ),
            FeatureRule(
                name="realtime_superchat_donations",
                enabled=True,
                rollout_percentage=100,
                allowed_roles=["creator", "admin", "viewer"],
                description="Enable paid Super Chat donations and live pin banners",
            ),
            FeatureRule(
                name="neural_semantic_search",
                enabled=True,
                rollout_percentage=25,
                allowed_roles=["admin", "creator"],
                description="Vector-based semantic search candidate generation",
            ),
            FeatureRule(
                name="edge_token_auth_validation",
                enabled=True,
                rollout_percentage=100,
                description="Validate JWT signatures directly at Cloudflare Edge Workers",
            ),
        ]
        with self._lock:
            for rule in defaults:
                self._local_rules[rule.name] = rule

    def is_enabled(
        self,
        flag_name: str,
        user_id: str | None = None,
        user_role: str | None = None,
    ) -> bool:
        """Evaluate if a feature is enabled for the given context.
        
        Evaluation precedence:
        1. Flag master toggle (if False -> False)
        2. Specific user whitelisting (if in allowed_users -> True)
        3. Role whitelisting (if in allowed_roles -> True)
        4. Percentage rollout bucketing (deterministic MD5 hash % 100)
        """
        rule = self.get_rule(flag_name)
        if not rule or not rule.enabled:
            return False

        # 1. User whitelisting
        if user_id and user_id in rule.allowed_users:
            return True

        # 2. Role whitelisting
        if user_role and user_role in rule.allowed_roles:
            return True

        # 3. 100% rollout
        if rule.rollout_percentage >= 100:
            return True

        # 4. 0% rollout
        if rule.rollout_percentage <= 0:
            return False

        # 5. Deterministic hash bucketing based on user_id or IP
        subject_key = str(user_id or "anonymous")
        bucket = self._calculate_bucket(flag_name, subject_key)
        return bucket < rule.rollout_percentage

    def get_rule(self, flag_name: str) -> FeatureRule | None:
        """Fetch flag rule from Redis or local cache."""
        self._maybe_sync_from_redis()
        with self._lock:
            return self._local_rules.get(flag_name)

    def set_rule(self, rule: FeatureRule) -> None:
        """Update or register a feature rule, syncing to Redis across pods."""
        with self._lock:
            self._local_rules[rule.name] = rule

        redis_client = CACHE.redis if CACHE.is_redis_active else None
        if redis_client:
            try:
                data = {
                    "name": rule.name,
                    "enabled": rule.enabled,
                    "rollout_percentage": rule.rollout_percentage,
                    "allowed_roles": rule.allowed_roles,
                    "allowed_users": rule.allowed_users,
                    "description": rule.description,
                }
                redis_client.hset("watchbloom:feature_flags", rule.name, json.dumps(data))
            except Exception as e:
                logger.warning(f"Could not persist feature flag {rule.name} to Redis: {e}")

    def _maybe_sync_from_redis(self) -> None:
        """Periodically refresh local rule definitions from Redis."""
        now = time.time()
        if now - self._last_sync_time < self._sync_interval_seconds:
            return

        redis_client = CACHE.redis if CACHE.is_redis_active else None
        if not redis_client:
            return

        try:
            raw_flags = redis_client.hgetall("watchbloom:feature_flags")
            if raw_flags:
                with self._lock:
                    for _, val in raw_flags.items():
                        parsed = json.loads(val)
                        self._local_rules[parsed["name"]] = FeatureRule(
                            name=parsed["name"],
                            enabled=parsed.get("enabled", False),
                            rollout_percentage=parsed.get("rollout_percentage", 0),
                            allowed_roles=parsed.get("allowed_roles", []),
                            allowed_users=parsed.get("allowed_users", []),
                            description=parsed.get("description", ""),
                        )
            self._last_sync_time = now
        except Exception:
            pass

    @staticmethod
    def _calculate_bucket(flag_name: str, subject_key: str) -> int:
        """Compute stable deterministic bucket 0..99 using MD5 hash."""
        combo = f"{flag_name}:{subject_key}".encode("utf-8")
        digest = hashlib.md5(combo).hexdigest()
        # Take first 8 hex characters and modulo 100
        return int(digest[:8], 16) % 100


FEATURE_FLAGS = FeatureFlagEngine()

