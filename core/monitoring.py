"""Monitoring and Production Error Tracking Module.
Integrates Sentry SDK with Flask integration and Prometheus telemetry.
Gracefully handles missing SENTRY_DSN in local and development environments.
"""

import logging
import os
from typing import Any
from flask import Flask

logger = logging.getLogger("watchbloom.monitoring")


def init_monitoring(app: Flask | None = None) -> bool:
    """Initialize Sentry production error logging if SENTRY_DSN is configured.
    Returns True if Sentry was initialized, False otherwise.
    """
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if not dsn:
        logger.info("SENTRY_DSN is not configured; live Sentry error logging disabled.")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        environment = os.environ.get("SENTRY_ENVIRONMENT", os.environ.get("FLASK_ENV", "production"))
        sample_rate_str = os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.2")
        try:
            traces_sample_rate = float(sample_rate_str)
        except ValueError:
            traces_sample_rate = 0.2

        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            traces_sample_rate=traces_sample_rate,
            integrations=[
                FlaskIntegration(),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
            ],
            send_default_pii=False,
        )
        logger.info(f"Sentry error monitoring initialized (environment: {environment}).")
        return True
    except Exception as exc:
        logger.warning(f"Failed to initialize Sentry monitoring: {exc}")
        return False


def capture_exception(exc: BaseException, **kwargs: Any) -> None:
    """Helper to capture unhandled exceptions to Sentry if available."""
    try:
        import sentry_sdk
        sentry_sdk.capture_exception(exc, **kwargs)
    except Exception:
        pass


def capture_message(message: str, level: Any = "info") -> None:
    """Helper to capture messages to Sentry if available."""
    try:
        import sentry_sdk
        sentry_sdk.capture_message(message, level=level)
    except Exception:
        pass

