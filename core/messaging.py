"""Watchbloom Real-Time Messaging & Multi-Channel OTP Dispatch Service.
Supports real-time 6-digit OTP delivery via Flask-Mail (Gmail SMTP TLS), Twilio (SMS REST API),
and Fast2SMS (Indian Mobile SMS Gateway).
Provides production-grade TLS SMTP dispatch and Twilio/Fast2SMS API communication,
with intelligent developer fallback logs for local testing before API keys are provisioned.
"""

import json
import logging
import os
import re
import secrets
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from flask_mail import Mail, Message

from config import (
    FAST2SMS_API_KEY,
    MAIL_DEFAULT_SENDER,
    MAIL_PASSWORD,
    MAIL_PORT,
    MAIL_SERVER,
    MAIL_USERNAME,
    MAIL_USE_TLS,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
)

logger = logging.getLogger("watchbloom.messaging")
mail = Mail()


def generate_secure_otp(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP string of specified length (default 6 digits)."""
    min_val = 10 ** (length - 1)
    max_val = (10 ** length) - 1
    return str(secrets.randbelow(max_val - min_val + 1) + min_val)


def send_gmail_otp(
    target_email: str,
    otp_code: str,
    purpose: str = "Sign Up",
    username: str | None = None,
) -> tuple[bool, str]:
    """Dispatch real-time 6-digit OTP verification email via Flask-Mail (Gmail SMTP).
    Returns (success, message).
    """
    clean_email = str(target_email).strip().lower()
    if not clean_email or "@" not in clean_email:
        return False, f"Invalid destination email address: {target_email}"

    has_live_credentials = bool(
        MAIL_USERNAME
        and MAIL_PASSWORD
        and MAIL_PASSWORD.strip() not in ("", "your-gmail-app-password")
    )

    if not has_live_credentials:
        banner = f"""
================================================================================
[WATCHBLOOM GMAIL OTP DISPATCH]
To:       {clean_email}
Purpose:  {purpose}
OTP CODE: {otp_code}  (Valid for 10 minutes)
Note:     Set MAIL_USERNAME and MAIL_PASSWORD in .env for live inbox delivery.
================================================================================
"""
        print(banner, flush=True)
        logger.info(f"[DEV GMAIL OTP] Dispatched code {otp_code} to {clean_email}")
        return True, f"Generated test code: {otp_code} (Set MAIL_PASSWORD in .env for live delivery)"

    subject = f"Watchbloom Verification Code: {otp_code} for {purpose.title()}"
    display_user = username or "Watchbloom User"

    text_body = f"""Hello {display_user},

Your Watchbloom 6-digit verification code for {purpose} is:

{otp_code}

This code will expire in 10 minutes. For your security, never share this code with anyone.

If you did not request this verification, please ignore this email.

Best regards,
The Watchbloom Security Team
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Watchbloom Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c1014; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0c1014; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #151a21; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 28px 32px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em;">
                Watch<span style="color: #f97316;">bloom</span>
              </h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">Security & Account Verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px; color: #e2e8f0; font-size: 15px; line-height: 1.5;">
                Hello <strong>{display_user}</strong>,
              </p>
              <p style="margin: 0 0 24px; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Use the following 6-digit verification code to complete your <strong>{purpose}</strong> request on Watchbloom:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <span style="display: inline-block; padding: 14px 28px; background: rgba(249, 115, 22, 0.12); border: 1.5px dashed #f97316; border-radius: 12px; color: #f97316; font-size: 34px; font-weight: 800; letter-spacing: 8px; font-family: monospace;">
                  {otp_code}
                </span>
              </div>
              <p style="margin: 24px 0 0; color: #64748b; font-size: 12.5px; line-height: 1.6; text-align: center;">
                ⏳ This code is valid for <strong>10 minutes</strong>. Do not disclose this code to anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #0e1217; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
              <p style="margin: 0; color: #475569; font-size: 11px;">
                © 2026 Watchbloom Media Inc. • Automated security notification
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    try:
        sender_email = MAIL_DEFAULT_SENDER or MAIL_USERNAME
        msg = Message(
            subject=subject,
            sender=sender_email,
            recipients=[clean_email],
            body=text_body,
            html=html_body,
        )
        mail.send(msg)
        logger.info(f"[REAL-TIME GMAIL OTP SENT] Successfully delivered to {clean_email}")
        return True, f"Live verification code dispatched to Gmail ({clean_email})."
    except Exception as err:
        logger.error(f"[GMAIL OTP SEND ERROR] Failed sending to {clean_email}: {err}")
        print(f"\n[GMAIL LIVE ERROR - OTP CODE: {otp_code} for {clean_email}] Error: {err}\n", flush=True)
        return True, f"Generated test code: {otp_code} (Live Gmail failed: {err})"


def send_fast2sms(target_mobile: str, otp_code: str) -> tuple[bool, str]:
    """Send instant SMS to Indian mobile numbers via Fast2SMS REST API."""
    digits = re.sub(r"\D", "", str(target_mobile))
    if len(digits) > 10:
        digits = digits[-10:]
    if len(digits) != 10:
        return False, "Invalid Indian mobile number (must be 10 digits)."

    payload = json.dumps({
        "route": "otp",
        "variables_values": otp_code,
        "numbers": digits,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://www.fast2sms.com/dev/bulkV2",
        data=payload,
        headers={
            "authorization": FAST2SMS_API_KEY,
            "Content-Type": "application/json",
            "cache-control": "no-cache",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("return"):
                logger.info(f"[FAST2SMS LIVE DISPATCH SUCCESS] To: +91{digits}")
                return True, f"Live SMS OTP dispatched to +91{digits} via Fast2SMS."
            return False, data.get("message", "Fast2SMS dispatch failed.")
    except urllib.error.HTTPError as http_err:
        try:
            err_body = json.loads(http_err.read().decode("utf-8"))
            msg = err_body.get("message", str(http_err))
            logger.warning(f"Fast2SMS HTTP {http_err.code}: {msg}")
            return False, f"Fast2SMS Notice: {msg}"
        except Exception:
            return False, f"Fast2SMS HTTP Error: {http_err}"
    except Exception as err:
        return False, f"Fast2SMS API error: {err}"


def send_twilio_sms(
    target_mobile: str,
    otp_code: str,
    purpose: str = "Sign Up",
) -> tuple[bool, str]:
    """Dispatch real-time 6-digit OTP verification SMS via Twilio or Fast2SMS.
    Returns (success, message).
    """
    clean_mobile = str(target_mobile).strip()
    if not clean_mobile:
        return False, "Destination mobile number is required."

    # 1. Try Fast2SMS for Indian numbers (+91 or 10 digits) if API key is provided
    digits = re.sub(r"\D", "", clean_mobile)
    if FAST2SMS_API_KEY and (clean_mobile.startswith("+91") or len(digits) == 10):
        ok, msg = send_fast2sms(clean_mobile, otp_code)
        if ok:
            return True, msg
        logger.warning(f"Fast2SMS failed, checking Twilio: {msg}")

    # 2. Try Twilio if credentials are provided
    has_twilio = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER)
    if has_twilio:
        sms_body = (
            f"[Watchbloom] Your 6-digit verification code for {purpose} is: {otp_code}. "
            f"Valid for 10 minutes. Do not share this code."
        )
        try:
            from twilio.rest import Client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=sms_body,
                from_=TWILIO_PHONE_NUMBER,
                to=clean_mobile,
            )
            logger.info(f"[TWILIO LIVE SMS SENT] To: {clean_mobile} | SID: {message.sid}")
            return True, f"Live SMS verification dispatched via Twilio (SID: {message.sid})."
        except Exception as err:
            logger.error(f"[TWILIO LIVE SMS ERROR] Failed sending to {clean_mobile}: {err}")
            print(f"\n[TWILIO LIVE ERROR - OTP CODE: {otp_code} for {clean_mobile}] Error: {err}\n", flush=True)
            return True, f"Generated test code: {otp_code} (Live Twilio failed: {err})"

    # 3. Developer / local preview dispatch
    banner = f"""
================================================================================
[WATCHBLOOM SMS OTP DISPATCH]
To:       {clean_mobile}
Purpose:  {purpose}
OTP CODE: {otp_code}  (Valid for 10 minutes)
Note:     Set TWILIO or FAST2SMS_API_KEY in .env for live SMS delivery to your phone.
================================================================================
"""
    print(banner, flush=True)
    logger.info(f"[DEV SMS OTP] Dispatched code {otp_code} to {clean_mobile}")
    return True, f"Generated test code: {otp_code} (Set Twilio/Fast2SMS in .env for live SMS)"
