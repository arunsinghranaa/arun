"""Unit Tests for Watchbloom Flask-Login & SQLAlchemy Authentication System.
Verifies secure registration, login, logout, Gmail/mobile contact validation,
Flask-Login session persistence, and strict per-account data privacy.
"""

import unittest
import uuid
from unittest.mock import patch
from app import app
from core.models import db, OTPVerification, User, UserSavedVideo, UserWatchHistory


class FlaskLoginAuthTests(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        app.config["WTF_CSRF_ENABLED"] = False
        self.client = app.test_client()
        self.uid_suffix = uuid.uuid4().hex[:6]
        with app.app_context():
            db.create_all()

    def test_registration_with_gmail_and_mobile(self):
        """Verify successful user registration with Gmail and mobile phone fields."""
        uname = f"rohit_{self.uid_suffix}"
        payload = {
            "username": uname,
            "password": "HitmanPassword2026!",
            "email": f"{uname}@gmail.com",
            "mobile": "+919876543210",
            "role": "creator",
        }
        res = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["user"]["username"], uname)
        self.assertEqual(data["user"]["email"], f"{uname}@gmail.com")
        self.assertEqual(data["user"]["mobile"], "+919876543210")
        self.assertEqual(data["user"]["role"], "creator")
        self.assertTrue(bool(data.get("token")))

    def test_registration_format_validation(self):
        """Verify registration rejects invalid Gmail format or invalid mobile contact digits."""
        # 1. Invalid email
        res1 = self.client.post("/api/v1/auth/register", json={
            "username": f"bad_email_{self.uid_suffix}",
            "password": "Password123!",
            "email": "invalid-email-address",
            "mobile": "+15551234567",
        })
        self.assertEqual(res1.status_code, 400)
        self.assertIn("Invalid Gmail or email", res1.get_json()["error"])

        # 2. Invalid mobile (too short)
        res2 = self.client.post("/api/v1/auth/register", json={
            "username": f"bad_phone_{self.uid_suffix}",
            "password": "Password123!",
            "email": f"valid_{self.uid_suffix}@gmail.com",
            "mobile": "123",
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("Invalid mobile contact number", res2.get_json()["error"])

        # 3. Password mismatch (confirm_password mismatch in OTP signup)
        res3 = self.client.post("/api/v1/auth/signup/send-otp", json={
            "username": f"mismatch_{self.uid_suffix}",
            "password": "Password123!",
            "confirm_password": "DifferentPassword456!",
            "email": f"mismatch_{self.uid_suffix}@gmail.com",
        })
        self.assertEqual(res3.status_code, 400)
        self.assertIn("Passwords do not match", res3.get_json()["error"])

    def test_login_via_username_gmail_and_mobile(self):
        """Verify flexible login via Username, Gmail address, or Mobile number."""
        import random
        rand_num = random.randint(100000, 999999)
        uname = f"virat_{rand_num}"
        uemail = f"virat_{rand_num}@gmail.com"
        umobile = f"+919988{rand_num}"
        self.client.post("/api/v1/auth/register", json={
            "username": uname,
            "password": "KingKohliPassword18!",
            "email": uemail,
            "mobile": umobile,
            "role": "creator",
        })

        # 1. Login with Username
        res_user = self.client.post("/api/v1/auth/login", json={
            "username": uname,
            "password": "KingKohliPassword18!",
        })
        self.assertEqual(res_user.status_code, 200)
        self.assertEqual(res_user.get_json()["user"]["username"], uname)

        # 2. Login with Gmail
        res_email = self.client.post("/api/v1/auth/login", json={
            "username": uemail,
            "password": "KingKohliPassword18!",
        })
        self.assertEqual(res_email.status_code, 200)
        self.assertEqual(res_email.get_json()["user"]["username"], uname)

        # 3. Login with Mobile
        res_mobile = self.client.post("/api/v1/auth/login", json={
            "username": umobile,
            "password": "KingKohliPassword18!",
        })
        self.assertEqual(res_mobile.status_code, 200)
        self.assertEqual(res_mobile.get_json()["user"]["username"], uname)

        # 4. Reject invalid password
        res_bad = self.client.post("/api/v1/auth/login", json={
            "username": uname,
            "password": "WrongPassword!",
        })
        self.assertEqual(res_bad.status_code, 401)

    def test_flask_login_session_lifecycle(self):
        """Verify Flask-Login session cookies persist auth across requests and logout clears session."""
        client = app.test_client()

        # Initially unauthenticated
        res_guest = client.get("/api/v1/auth/me")
        self.assertEqual(res_guest.status_code, 401)

        # Login sets Flask session cookie
        login_res = client.post("/api/v1/auth/login", json={
            "username": "creator",
            "password": "creator123",
        })
        self.assertEqual(login_res.status_code, 200)

        # Now GET /api/v1/auth/me succeeds WITHOUT Bearer token header
        me_res = client.get("/api/v1/auth/me")
        self.assertEqual(me_res.status_code, 200)
        data = me_res.get_json()
        self.assertTrue(data.get("authenticated"))
        self.assertEqual(data["user"]["name"], "creator")

        # Logout clears session
        logout_res = client.post("/api/v1/auth/logout")
        self.assertEqual(logout_res.status_code, 200)

        # Post-logout request is unauthorized
        post_logout_res = client.get("/api/v1/auth/me")
        self.assertEqual(post_logout_res.status_code, 401)

    def test_account_data_privacy_and_isolation(self):
        """Verify saved videos and watch history are strictly isolated between accounts."""
        client_a = app.test_client()
        client_b = app.test_client()

        uname_a = f"alpha_{self.uid_suffix}"
        uname_b = f"beta_{self.uid_suffix}"

        reg_a = client_a.post("/api/v1/auth/register", json={
            "username": uname_a,
            "password": "AlphaPassword123!",
            "email": f"{uname_a}@gmail.com",
            "mobile": "+15551112233",
        })
        self.assertEqual(reg_a.status_code, 201)

        reg_b = client_b.post("/api/v1/auth/register", json={
            "username": uname_b,
            "password": "BetaPassword123!",
            "email": f"{uname_b}@gmail.com",
            "mobile": "+15554445566",
        })
        self.assertEqual(reg_b.status_code, 201)

        # User Alpha saves video 'v1' and watches 'v1'
        res_save_a = client_a.post("/api/v1/user/saved", json={"item_id": "v1"})
        self.assertEqual(res_save_a.status_code, 200)
        res_hist_a = client_a.post("/api/v1/user/history", json={"item_id": "v1"})
        self.assertEqual(res_hist_a.status_code, 200)

        # Verify User Alpha sees 1 saved and 1 history item
        alpha_saved = client_a.get("/api/v1/user/saved").get_json()
        self.assertEqual(alpha_saved["total"], 1)
        self.assertEqual(alpha_saved["results"][0]["id"], "v1")

        alpha_history = client_a.get("/api/v1/user/history").get_json()
        self.assertEqual(alpha_history["total"], 1)
        self.assertEqual(alpha_history["results"][0]["id"], "v1")

        # Verify User Beta cannot see User Alpha's saved items or watch history (Data Privacy)
        beta_saved = client_b.get("/api/v1/user/saved").get_json()
        self.assertEqual(beta_saved["total"], 0)
        self.assertEqual(len(beta_saved["results"]), 0)

        beta_history = client_b.get("/api/v1/user/history").get_json()
        self.assertEqual(beta_history["total"], 0)
        self.assertEqual(len(beta_history["results"]), 0)

        # User Beta saves 'v2'
        client_b.post("/api/v1/user/saved", json={"item_id": "v2"})
        beta_saved_updated = client_b.get("/api/v1/user/saved").get_json()
        self.assertEqual(beta_saved_updated["total"], 1)
        self.assertEqual(beta_saved_updated["results"][0]["id"], "v2")

        # User Alpha still only sees 'v1', not 'v2'
        alpha_saved_recheck = client_a.get("/api/v1/user/saved").get_json()
        self.assertEqual(alpha_saved_recheck["total"], 1)
        self.assertEqual(alpha_saved_recheck["results"][0]["id"], "v1")

        # User Alpha deletes 'v1' from saved videos
        del_res = client_a.delete("/api/v1/user/saved/v1")
        self.assertEqual(del_res.status_code, 200)
        alpha_saved_empty = client_a.get("/api/v1/user/saved").get_json()
        self.assertEqual(alpha_saved_empty["total"], 0)

        # User Beta's saved 'v2' is intact
        beta_saved_intact = client_b.get("/api/v1/user/saved").get_json()
        self.assertEqual(beta_saved_intact["total"], 1)
        self.assertEqual(beta_saved_intact["results"][0]["id"], "v2")

    @patch("app.send_gmail_otp", return_value=(True, "Delivered via Flask-Mail SMTP"))
    @patch("app.generate_secure_otp", return_value="847291")
    def test_strict_signup_otp_invariant_and_verification(self, mock_otp, mock_mail):
        """Verify user is NOT created in SQLAlchemy database until 6-digit OTP is verified."""
        uname = f"strict_user_{self.uid_suffix}"
        uemail = f"strict_{self.uid_suffix}@gmail.com"
        umobile = f"+9198765{self.uid_suffix[:5]}"
        payload = {
            "username": uname,
            "password": "StrictPassword2026!",
            "email": uemail,
            "mobile": umobile,
            "role": "creator",
            "channel": "email",
        }

        # 1. Initiate Sign Up OTP
        res_send = self.client.post("/api/v1/auth/signup/send-otp", json=payload)
        self.assertEqual(res_send.status_code, 200)
        send_data = res_send.get_json()
        self.assertTrue(send_data["success"])
        session_id = send_data["session_id"]
        self.assertEqual(send_data["target_type"], "email")

        # 2. STRICT INVARIANT: Ensure User row DOES NOT exist in DB yet
        with app.app_context():
            user_in_db = User.query.filter_by(username=uname).first()
            self.assertIsNone(user_in_db, "User must NOT exist in database prior to OTP validation")

            # Check that OTPVerification record exists
            otp_record = db.session.get(OTPVerification, session_id)
            self.assertIsNotNone(otp_record)
            assert otp_record is not None
            self.assertFalse(otp_record.is_verified)
            self.assertEqual(otp_record.purpose, "signup")

        # 3. Reject invalid OTP code
        res_bad = self.client.post("/api/v1/auth/signup/verify-otp", json={
            "session_id": session_id,
            "otp_code": "000000",
        })
        self.assertEqual(res_bad.status_code, 400)
        self.assertIn("Incorrect verification code", res_bad.get_json()["error"])

        # User STILL must not exist in database
        with app.app_context():
            self.assertIsNone(User.query.filter_by(username=uname).first())

        # 4. Submit correct 6-digit OTP code
        res_good = self.client.post("/api/v1/auth/signup/verify-otp", json={
            "session_id": session_id,
            "otp_code": "847291",
        })
        self.assertEqual(res_good.status_code, 201)
        good_data = res_good.get_json()
        self.assertTrue(good_data["success"])
        self.assertEqual(good_data["user"]["username"], uname)
        self.assertTrue(good_data["user"]["is_email_verified"])
        self.assertTrue(bool(good_data.get("token")))

        # 5. NOW user exists in the database
        with app.app_context():
            created_user = User.query.filter_by(username=uname).first()
            self.assertIsNotNone(created_user)
            assert created_user is not None
            self.assertEqual(created_user.email, uemail)
            self.assertTrue(created_user.is_email_verified)
            self.assertTrue(created_user.check_password("StrictPassword2026!"))

    @patch("app.send_twilio_sms", return_value=(True, "Delivered via Twilio SMS"))
    @patch("app.generate_secure_otp", return_value="392817")
    def test_signup_otp_mobile_twilio_flow(self, mock_otp, mock_sms):
        """Verify Sign Up verification via mobile phone SMS (Twilio)."""
        uname = f"mobile_user_{self.uid_suffix}"
        uemail = f"mobile_{self.uid_suffix}@gmail.com"
        umobile = f"+155577{self.uid_suffix[:4]}"
        payload = {
            "username": uname,
            "password": "MobilePassword123!",
            "email": uemail,
            "mobile": umobile,
            "role": "viewer",
            "channel": "mobile",
        }

        res_send = self.client.post("/api/v1/auth/signup/send-otp", json=payload)
        self.assertEqual(res_send.status_code, 200)
        session_id = res_send.get_json()["session_id"]
        self.assertEqual(res_send.get_json()["target_type"], "mobile")

        # Verify correct OTP
        res_verify = self.client.post("/api/v1/auth/signup/verify-otp", json={
            "session_id": session_id,
            "otp_code": "392817",
        })
        self.assertEqual(res_verify.status_code, 201)
        self.assertTrue(res_verify.get_json()["user"]["is_mobile_verified"])

    @patch("app.send_gmail_otp", return_value=(True, "Delivered via Flask-Mail SMTP"))
    @patch("app.generate_secure_otp", return_value="554433")
    def test_signin_otp_flow(self, mock_otp, mock_mail):
        """Verify Sign In OTP challenge and verification with Flask-Login session."""
        uname = f"signin_user_{self.uid_suffix}"
        uemail = f"signin_{self.uid_suffix}@gmail.com"
        pwd = "SignInSecret999!"

        # Register direct user first
        self.client.post("/api/v1/auth/register", json={
            "username": uname,
            "password": pwd,
            "email": uemail,
            "mobile": "+15556667788",
        })

        # 1. Send OTP for sign in
        res_send = self.client.post("/api/v1/auth/signin/send-otp", json={
            "username": uname,
            "password": pwd,
        })
        self.assertEqual(res_send.status_code, 200)
        session_id = res_send.get_json()["session_id"]

        # 2. Reject incorrect OTP
        res_bad = self.client.post("/api/v1/auth/signin/verify-otp", json={
            "session_id": session_id,
            "otp_code": "000000",
        })
        self.assertEqual(res_bad.status_code, 400)

        # 3. Verify correct OTP
        res_verify = self.client.post("/api/v1/auth/signin/verify-otp", json={
            "session_id": session_id,
            "otp_code": "554433",
        })
        self.assertEqual(res_verify.status_code, 200)
        self.assertTrue(res_verify.get_json()["success"])
        self.assertEqual(res_verify.get_json()["user"]["username"], uname)

        # 4. Verify authenticated session
        token = res_verify.get_json()["token"]
        me_res = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.get_json()["user"]["username"], uname)

    @patch("app.send_gmail_otp", return_value=(True, "Delivered via Flask-Mail SMTP"))
    @patch("app.generate_secure_otp", return_value="112233")
    def test_otp_max_attempts_invalidation(self, mock_otp, mock_mail):
        """Verify OTP challenge is invalidated after exceeding maximum failed attempts."""
        uname = f"attempt_user_{self.uid_suffix}"
        res = self.client.post("/api/v1/auth/signup/send-otp", json={
            "username": uname,
            "password": "MaxAttemptsPassword1!",
            "email": f"{uname}@gmail.com",
        })
        session_id = res.get_json()["session_id"]

        # Attempt 5 times with wrong code
        for _ in range(5):
            bad = self.client.post("/api/v1/auth/signup/verify-otp", json={
                "session_id": session_id,
                "otp_code": "999999",
            })
            self.assertEqual(bad.status_code, 400)

        # 6th attempt with the CORRECT code should now be rejected due to lockout
        res_lockout = self.client.post("/api/v1/auth/signup/verify-otp", json={
            "session_id": session_id,
            "otp_code": "112233",
        })
        self.assertEqual(res_lockout.status_code, 400)
        self.assertIn("Maximum verification attempts exceeded", res_lockout.get_json()["error"])

    @patch("app.send_gmail_otp", return_value=(True, "Delivered via Flask-Mail SMTP"))
    @patch("app.generate_secure_otp", side_effect=["111111", "222222"])
    def test_resend_otp_flow(self, mock_otp, mock_mail):
        """Verify resending a fresh OTP updates the challenge session."""
        uname = f"resend_user_{self.uid_suffix}"
        res = self.client.post("/api/v1/auth/signup/send-otp", json={
            "username": uname,
            "password": "ResendPassword123!",
            "email": f"{uname}@gmail.com",
        })
        session_id = res.get_json()["session_id"]

        # Resend OTP
        res_resend = self.client.post("/api/v1/auth/resend-otp", json={"session_id": session_id})
        self.assertEqual(res_resend.status_code, 200)

        # First code should now fail
        res_old = self.client.post("/api/v1/auth/signup/verify-otp", json={
            "session_id": session_id,
            "otp_code": "111111",
        })
        self.assertEqual(res_old.status_code, 400)

        # New code should succeed
        res_new = self.client.post("/api/v1/auth/signup/verify-otp", json={
            "session_id": session_id,
            "otp_code": "222222",
        })
        self.assertEqual(res_new.status_code, 201)

    @patch("core.messaging.MAIL_PASSWORD", "")
    def test_otp_preview_mode_and_live_dispatch(self):
        """Verify that when SMTP/Twilio credentials are not set, a test OTP code is provided so users are not blocked."""
        uname = f"preview_user_{self.uid_suffix}"
        res = self.client.post("/api/v1/auth/signup/send-otp", json={
            "username": uname,
            "password": "Password123!",
            "email": f"{uname}@gmail.com",
            "channel": "email",
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("dev_otp", data)
        self.assertEqual(len(data["dev_otp"]), 6)

        # Verify user can complete registration with this OTP
        res_verify = self.client.post("/api/v1/auth/signup/verify-otp", json={
            "session_id": data["session_id"],
            "otp_code": data["dev_otp"],
        })
        self.assertEqual(res_verify.status_code, 201)
        self.assertTrue(res_verify.get_json()["success"])
        self.assertEqual(res_verify.get_json()["user"]["username"], uname)

    def test_creator_studio_requires_authentication(self):
        """Verify unauthenticated guests cannot access Creator Studio content."""
        res = self.client.get("/api/v1/studio/content")
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertIn("Creator Studio requires authentication", data.get("error", ""))

    def test_creator_studio_per_user_isolation_and_management(self):
        """Verify strict per-user Creator Studio isolation:
        - Creator A only sees their own content.
        - Creator B cannot see or delete Creator A's content.
        - Public users can watch Creator A's live stream, but only Creator A can manage/delete it.
        """
        user_a = f"creator_a_{self.uid_suffix}"
        user_b = f"creator_b_{self.uid_suffix}"

        # Register User A
        res_reg_a = self.client.post("/api/v1/auth/register", json={
            "username": user_a,
            "password": "PasswordA123!",
            "email": f"{user_a}@gmail.com",
            "role": "creator",
        })
        self.assertEqual(res_reg_a.status_code, 201)

        # Register User B
        res_reg_b = self.client.post("/api/v1/auth/register", json={
            "username": user_b,
            "password": "PasswordB123!",
            "email": f"{user_b}@gmail.com",
            "role": "creator",
        })
        self.assertEqual(res_reg_b.status_code, 201)

        # 1. Sign in as Creator A
        res_login_a = self.client.post("/api/v1/auth/login", json={
            "username": user_a,
            "password": "PasswordA123!",
        })
        self.assertEqual(res_login_a.status_code, 200)

        # Creator A starts a live stream
        stream_id = f"v_live_stream_a_{self.uid_suffix}"
        res_live = self.client.post("/api/v1/live/start", json={
            "id": stream_id,
            "title": f"Creator A Exclusive Stream {self.uid_suffix}",
            "category": "entertainment",
        })
        self.assertEqual(res_live.status_code, 201)

        # Creator A checks Creator Studio -> Stream must be present
        res_studio_a = self.client.get("/api/v1/studio/content")
        self.assertEqual(res_studio_a.status_code, 200)
        data_a = res_studio_a.get_json()
        self.assertEqual(data_a["creator"]["username"], user_a)
        video_ids_a = [v["id"] for v in data_a["videos"]]
        self.assertIn(stream_id, video_ids_a)

        # 2. Public viewers (unauthenticated or another user) can see active stream on public site
        res_public_active = self.client.get("/api/v1/live/active")
        self.assertEqual(res_public_active.status_code, 200)
        public_stream_ids = [s["id"] for s in res_public_active.get_json()["streams"]]
        self.assertIn(stream_id, public_stream_ids)

        # 3. Log out and log in as Creator B
        self.client.post("/api/v1/auth/logout")
        res_login_b = self.client.post("/api/v1/auth/login", json={
            "username": user_b,
            "password": "PasswordB123!",
        })
        self.assertEqual(res_login_b.status_code, 200)

        # Creator B checks Creator Studio -> Creator A's stream must NOT be in Creator B's studio!
        res_studio_b = self.client.get("/api/v1/studio/content")
        self.assertEqual(res_studio_b.status_code, 200)
        data_b = res_studio_b.get_json()
        self.assertEqual(data_b["creator"]["username"], user_b)
        video_ids_b = [v["id"] for v in data_b["videos"]]
        self.assertNotIn(stream_id, video_ids_b)

        # Creator B attempts to delete Creator A's stream -> MUST be forbidden (403)
        res_del_forbidden = self.client.delete(f"/api/v1/studio/videos/{stream_id}")
        self.assertEqual(res_del_forbidden.status_code, 403)
        self.assertIn("permission", res_del_forbidden.get_json()["error"].lower())

        # 4. Log back in as Creator A and delete own stream -> MUST succeed (200)
        self.client.post("/api/v1/auth/logout")
        self.client.post("/api/v1/auth/login", json={
            "username": user_a,
            "password": "PasswordA123!",
        })
        res_del_owner = self.client.delete(f"/api/v1/studio/videos/{stream_id}")
        self.assertEqual(res_del_owner.status_code, 200)
        self.assertTrue(res_del_owner.get_json()["success"])

        # Creator Studio for A now does not contain the deleted stream
        res_studio_a_after = self.client.get("/api/v1/studio/content")
        self.assertEqual(res_studio_a_after.status_code, 200)
        video_ids_a_after = [v["id"] for v in res_studio_a_after.get_json()["videos"]]
        self.assertNotIn(stream_id, video_ids_a_after)

    def test_user_channel_private_isolation(self):
        """Verify strict privacy for 'Your Channel':
        - Unauthenticated access to /api/v1/user/channel returns 401.
        - /api/v1/channels/guest returns 404 (no guest channels).
        - Authenticated user A only sees their own channel details and videos.
        - Authenticated user B only sees their own channel, never leaking user A's content.
        """
        # 1. Unauthenticated access returns 401
        res_unauth = self.client.get("/api/v1/user/channel")
        self.assertEqual(res_unauth.status_code, 401)

        # 2. Guest channel is not a valid channel (returns 404)
        res_guest = self.client.get("/api/v1/channels/guest")
        self.assertEqual(res_guest.status_code, 404)

        # 3. Create two distinct accounts
        user_a = f"chan_user_a_{self.uid_suffix}"
        user_b = f"chan_user_b_{self.uid_suffix}"

        self.client.post("/api/v1/auth/register", json={
            "username": user_a,
            "password": "PasswordChanA123!",
            "email": f"{user_a}@gmail.com",
            "role": "creator",
        })
        self.client.post("/api/v1/auth/register", json={
            "username": user_b,
            "password": "PasswordChanB123!",
            "email": f"{user_b}@gmail.com",
            "role": "creator",
        })

        # Login as User A
        self.client.post("/api/v1/auth/login", json={
            "username": user_a,
            "password": "PasswordChanA123!",
        })

        # User A creates a live event
        stream_id = f"v_live_chan_a_{self.uid_suffix}"
        self.client.post("/api/v1/live/start", json={
            "id": stream_id,
            "title": f"Chan A Broadcast {self.uid_suffix}",
            "category": "entertainment",
        })

        # User A fetches /api/v1/user/channel
        res_chan_a = self.client.get("/api/v1/user/channel")
        self.assertEqual(res_chan_a.status_code, 200)
        data_chan_a = res_chan_a.get_json()
        self.assertTrue(data_chan_a["success"])
        self.assertEqual(data_chan_a["channel"]["name"], user_a)
        self.assertTrue(data_chan_a["channel"]["is_own"])
        videos_a = [v["id"] for v in data_chan_a["videos"]]
        self.assertIn(stream_id, videos_a)

        # Login as User B
        self.client.post("/api/v1/auth/logout")
        self.client.post("/api/v1/auth/login", json={
            "username": user_b,
            "password": "PasswordChanB123!",
        })

        # User B fetches /api/v1/user/channel
        res_chan_b = self.client.get("/api/v1/user/channel")
        self.assertEqual(res_chan_b.status_code, 200)
        data_chan_b = res_chan_b.get_json()
        self.assertTrue(data_chan_b["success"])
        self.assertEqual(data_chan_b["channel"]["name"], user_b)
        self.assertTrue(data_chan_b["channel"]["is_own"])
        videos_b = [v["id"] for v in data_chan_b["videos"]]
        # User A's stream MUST NOT be present in User B's channel
        self.assertNotIn(stream_id, videos_b)


if __name__ == "__main__":
    unittest.main()
