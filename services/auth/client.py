"""gRPC Client for Auth Microservice with channel pooling, load balancing, and resilient policies."""

from typing import List, Optional, Union
import grpc
from core.grpc_interceptors import LoadBalancedChannelPool
from proto import auth_pb2, auth_pb2_grpc


class AuthClient:
    def __init__(
        self,
        target: Union[str, List[str]] = "localhost:50051",
        strategy: str = "round_robin",
        timeout: float = 5.0,
    ):
        self.target = target
        self.pool = LoadBalancedChannelPool(target, strategy=strategy, default_timeout=timeout)

    def _get_stub(self):
        channel = self.pool.get_channel()
        return auth_pb2_grpc.AuthServiceStub(channel)

    def authenticate(self, username: str, password: str | None = None, role: str = ""):
        stub = self._get_stub()
        req = auth_pb2.LoginRequest(username=username, password=password or "", role=role)
        return stub.Authenticate(req)

    def verify_token(self, token: str):
        stub = self._get_stub()
        req = auth_pb2.VerifyRequest(token=token)
        return stub.VerifyToken(req)

    def register_user(self, username: str, password: str, role: str = "viewer"):
        stub = self._get_stub()
        req = auth_pb2.RegisterRequest(username=username, password=password, role=role)
        return stub.RegisterUser(req)

    def revoke_token(self, token: str):
        stub = self._get_stub()
        req = auth_pb2.RevokeRequest(token=token)
        return stub.RevokeToken(req)

    def get_user_profile(self, token: str):
        stub = self._get_stub()
        req = auth_pb2.ProfileRequest(token=token)
        return stub.GetUserProfile(req)

    def get_user_settings(self, user_id: str):
        stub = self._get_stub()
        req = auth_pb2.UserSettingsRequest(user_id=user_id)
        return stub.GetUserSettings(req)

    def update_user_settings(self, user_id: str, **settings_kwargs):
        stub = self._get_stub()
        pb_settings = auth_pb2.UserSettings(
            user_id=user_id,
            profile_visibility=settings_kwargs.get("profile_visibility", "public"),
            show_subscriptions=bool(settings_kwargs.get("show_subscriptions", True)),
            show_liked_videos=bool(settings_kwargs.get("show_liked_videos", False)),
            search_indexing=bool(settings_kwargs.get("search_indexing", True)),
            default_quality=settings_kwargs.get("default_quality", "auto"),
            autoplay=bool(settings_kwargs.get("autoplay", True)),
            ambient_mode=bool(settings_kwargs.get("ambient_mode", True)),
            default_playback_rate=float(settings_kwargs.get("default_playback_rate", 1.0)),
            captions_enabled=bool(settings_kwargs.get("captions_enabled", False)),
            captions_language=settings_kwargs.get("captions_language", "en"),
            email_notifications=bool(settings_kwargs.get("email_notifications", True)),
            subscriber_alerts=bool(settings_kwargs.get("subscriber_alerts", True)),
            recommendation_alerts=bool(settings_kwargs.get("recommendation_alerts", True)),
            security_alerts=bool(settings_kwargs.get("security_alerts", True)),
        )
        req = auth_pb2.UpdateSettingsRequest(user_id=user_id, settings=pb_settings)
        return stub.UpdateUserSettings(req)

    def submit_abuse_report(
        self,
        reporter_id: str,
        target_type: str,
        target_id: str,
        reason_code: str,
        description: str = "",
        target_metadata: str = "",
    ):
        stub = self._get_stub()
        req = auth_pb2.AbuseReportRequest(
            reporter_id=reporter_id,
            target_type=target_type,
            target_id=target_id,
            reason_code=reason_code,
            description=description,
            target_metadata=target_metadata,
        )
        return stub.SubmitAbuseReport(req)

    def submit_support_mail(
        self,
        user_id: str,
        sender_email: str = "",
        subject: str = "",
        category: str = "general",
        message: str = "",
        **kwargs,
    ):
        email_val = sender_email or kwargs.get("email", "")
        stub = self._get_stub()
        req = auth_pb2.SupportMailRequest(
            user_id=user_id,
            sender_email=email_val,
            subject=subject,
            category=category,
            message=message,
        )
        return stub.SubmitSupportMail(req)

    def get_notification_logs(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False,
    ):
        stub = self._get_stub()
        req = auth_pb2.NotificationLogsRequest(
            user_id=user_id,
            limit=limit,
            offset=offset,
            unread_only=unread_only,
        )
        return stub.GetNotificationLogs(req)

    def mark_notification_read(self, user_id: str, notification_id: str):
        stub = self._get_stub()
        req = auth_pb2.MarkNotificationRequest(
            user_id=user_id,
            notification_id=notification_id,
        )
        return stub.MarkNotificationRead(req)

    def close(self):
        self.pool.close()
