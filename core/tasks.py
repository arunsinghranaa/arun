"""Distributed background tasks for asynchronous video processing and transcoding.
Powered by Celery with Redis broker and result backend.
"""

import logging
from pathlib import Path
from typing import Any
import uuid

from celery import Celery

from config import CELERY_BROKER_URL, CELERY_RESULT_BACKEND, HLS_DIR, VIDEO_DIR
import hls_packager
from core.cdn import R2_CLIENT
from core.counter_buffer import flush_counter_buffer

logger = logging.getLogger("watchbloom.tasks")

# Initialize Celery application
celery_app = Celery(
    "watchbloom",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=1800,  # 30 minutes max per transcoding job
    worker_prefetch_multiplier=1,  # Prevent worker greedily consuming heavy transcode jobs
    broker_connection_timeout=0.5,
    broker_connection_retry_on_startup=False,
)


@celery_app.task(bind=True, name="watchbloom.transcode_video")
def transcode_video_task(self, item_id: str, source_filename: str | None = None) -> dict[str, Any]:
    """Asynchronously transcode video into multi-bitrate HLS package and upload to CDN origin."""
    logger.info(f"Starting async HLS transcoding for video {item_id}")
    master_file = HLS_DIR / item_id / "master.m3u8"
    if master_file.is_file():
        return {
            "status": "completed",
            "item_id": item_id,
            "master_manifest": str(master_file),
            "uploaded_to_r2": False,
        }

    try:
        # 1. Generate multi-bitrate HLS variants locally
        master_path = hls_packager.package_vod_variants(item_id)

        # 2. Upload to Cloudflare R2 if configured
        uploaded_to_r2 = False
        if R2_CLIENT.is_configured:
            hls_item_dir = HLS_DIR / item_id
            for p in hls_item_dir.rglob("*"):
                if p.is_file():
                    rel = p.relative_to(hls_item_dir).as_posix()
                    r2_key = f"hls/{item_id}/{rel}"
                    content_type = "application/vnd.apple.mpegurl" if p.suffix == ".m3u8" else "video/MP2T"
                    R2_CLIENT.upload_file(p, r2_key, content_type=content_type)
            uploaded_to_r2 = True

        return {
            "status": "completed",
            "item_id": item_id,
            "master_manifest": str(master_path),
            "uploaded_to_r2": uploaded_to_r2,
        }
    except Exception as exc:
        logger.error(f"Transcoding task failed for {item_id}: {exc}")
        raise


@celery_app.task(bind=True, name="watchbloom.live_segment")
def generate_live_segment_task(self, stream_id: str, source_filename: str) -> dict[str, Any]:
    """Segment incoming live broadcast into rolling low-latency HLS."""
    source_path = VIDEO_DIR / source_filename
    manifest = hls_packager.create_live_segment(stream_id, source_path)
    return {
        "status": "completed",
        "stream_id": stream_id,
        "manifest": str(manifest),
    }


@celery_app.task(name="watchbloom.flush_counters")
def flush_counters_task() -> dict[str, int]:
    """Periodic task to flush Redis view & reaction buffers to the database."""
    return flush_counter_buffer()


@celery_app.task(bind=True, name="watchbloom.process_abuse_report")
def process_abuse_report_task(
    self,
    report_id: str,
    reporter_id: str,
    target_type: str,
    target_id: str,
    reason_code: str,
    description: str = "",
    target_metadata: str = "",
) -> dict[str, Any]:
    """Asynchronously process abuse/copyright report, evaluate severity, and notify reporter."""
    from core.settings_mail_reporting import create_system_notification, update_abuse_report_status

    logger.info(f"Processing abuse report {report_id} on {target_type} {target_id} (Reason: {reason_code})")
    update_abuse_report_status(report_id, "reviewing")

    # Dispatch acknowledgement notification to user
    if reporter_id and reporter_id != "anonymous":
        create_system_notification(
            user_id=reporter_id,
            title="Report Under Review",
            message=f"Your {reason_code} report on {target_type} '{target_id}' has been logged and assigned to moderation.",
            notif_type="report_update",
            metadata_json=f'{{"report_id": "{report_id}", "target_id": "{target_id}", "reason": "{reason_code}"}}',
        )

    return {
        "status": "reviewing",
        "report_id": report_id,
        "target_type": target_type,
        "target_id": target_id,
    }


@celery_app.task(bind=True, name="watchbloom.send_support_mail")
def send_support_mail_task(
    self,
    mail_id: str,
    user_id: str,
    sender_email: str,
    subject: str,
    category: str,
    message: str,
) -> dict[str, Any]:
    """Asynchronously deliver support inquiry email to admin via SMTP and generate user notification."""
    from core.settings_mail_reporting import create_system_notification, update_support_mail_status

    logger.info(f"Sending support ticket {mail_id} from {sender_email} (Category: {category}): {subject}")

    # ── Send real email to admin via SMTP ──
    email_sent = _send_helpdesk_email(
        mail_id=mail_id,
        sender_email=sender_email,
        subject=subject,
        category=category,
        message=message,
    )

    update_support_mail_status(mail_id, "delivered" if email_sent else "queued")

    # Send confirmation notification to user
    if user_id:
        create_system_notification(
            user_id=user_id,
            title=f"Support Ticket Logged ({category.capitalize()})",
            message=f"Inquiry '{subject}' (Ref #{mail_id[:8]}) has been received. Our team will contact {sender_email}.",
            notif_type="support_reply",
            metadata_json=f'{{"mail_id": "{mail_id}", "category": "{category}"}}',
        )

    return {
        "status": "delivered" if email_sent else "queued",
        "mail_id": mail_id,
        "recipient": sender_email,
        "email_sent": email_sent,
    }


def _send_helpdesk_email(
    mail_id: str,
    sender_email: str,
    subject: str,
    category: str,
    message: str,
) -> bool:
    """Send a helpdesk support email to the admin address using smtplib.

    Returns True if the email was sent successfully, False otherwise.
    Gracefully degrades (logs warning) if SMTP credentials are not configured.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    from config import SMTP_HOST, SMTP_PORT, SMTP_USE_TLS, SMTP_USERNAME, SMTP_PASSWORD, ADMIN_EMAIL, SUPPORT_FROM_EMAIL

    if not ADMIN_EMAIL or not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning(
            f"SMTP not configured (ADMIN_EMAIL/SMTP_USERNAME/SMTP_PASSWORD missing). "
            f"Ticket {mail_id} saved to DB but email not sent. "
            f"Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and ADMIN_EMAIL env vars to enable."
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SUPPORT_FROM_EMAIL
        msg["To"] = ADMIN_EMAIL
        msg["Reply-To"] = sender_email
        msg["Subject"] = f"[Watchbloom Support] [{category.capitalize()}] {subject}"
        msg["X-Watchbloom-Ticket"] = mail_id

        # Plain-text body
        text_body = (
            f"━━━━ Watchbloom Helpdesk & Support ━━━━\n\n"
            f"Ticket ID  : {mail_id}\n"
            f"Category   : {category.capitalize()}\n"
            f"From       : {sender_email}\n"
            f"Subject    : {subject}\n\n"
            f"── Message ──\n\n"
            f"{message}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Reply directly to this email to respond to the user.\n"
        )

        # HTML body
        html_body = f"""\
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f8; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #6c5ce7, #a29bfe); padding: 24px 28px;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">🎧 Watchbloom Helpdesk &amp; Support</h1>
    </div>
    <div style="padding: 28px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px 0; color: #888; width: 110px;">Ticket ID</td><td style="padding: 8px 0; font-weight: 600;">{mail_id}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Category</td><td style="padding: 8px 0;"><span style="background: #6c5ce7; color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 13px;">{category.capitalize()}</span></td></tr>
        <tr><td style="padding: 8px 0; color: #888;">User Email</td><td style="padding: 8px 0;"><a href="mailto:{sender_email}" style="color: #6c5ce7;">{sender_email}</a></td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Subject</td><td style="padding: 8px 0; font-weight: 600;">{subject}</td></tr>
      </table>
      <div style="background: #f8f8fc; border-left: 4px solid #6c5ce7; padding: 16px; border-radius: 4px; white-space: pre-wrap; line-height: 1.6;">{message}</div>
      <p style="margin-top: 20px; color: #999; font-size: 13px;">Reply directly to this email to respond to the user.</p>
    </div>
  </div>
</body>
</html>"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # Connect and send
        if SMTP_USE_TLS:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15)

        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SUPPORT_FROM_EMAIL, [ADMIN_EMAIL], msg.as_string())
        server.quit()

        logger.info(f"Support email sent to {ADMIN_EMAIL} for ticket {mail_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to send support email for ticket {mail_id}: {e}", exc_info=True)
        return False


@celery_app.task(name="watchbloom.dispatch_notification")
def dispatch_system_notification_task(
    user_id: str,
    title: str,
    message: str,
    notif_type: str = "info",
    metadata_json: str = "",
) -> dict[str, Any]:
    """Asynchronously dispatch user system notification."""
    from core.settings_mail_reporting import create_system_notification
    res = create_system_notification(user_id, title, message, notif_type=notif_type, metadata_json=metadata_json)
    return {"status": "dispatched", "notification_id": res.get("id")}


def dispatch_async_job(task_func, *args, **kwargs) -> tuple[str, bool]:
    """Dispatch Celery task if broker is connected; falls back to simulated async job if offline.
    Returns (job_id, is_async).
    """
    from core.cache import CACHE
    if CACHE.is_redis:
        try:
            async_result = task_func.delay(*args, **kwargs)
            return str(async_result.id), True
        except Exception as err:
            logger.info(f"Celery queue error ({err}).")

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    return job_id, False
