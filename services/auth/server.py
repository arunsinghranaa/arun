"""Watchbloom Auth Microservice (gRPC Server)
Provides high-performance, strongly-typed internal RPCs for Authentication,
RBAC Permission resolution, and Token Revocation.
"""

from concurrent import futures
import logging
import grpc

from core.auth import (
    authenticate_user,
    decode_token,
    generate_token,
    get_permissions_for_role,
    register_user,
    revoke_token,
    Role,
)
from core.settings_mail_reporting import (
    create_abuse_report,
    create_support_mail,
    get_or_create_user_settings,
    get_user_notifications,
    mark_notification_read,
    update_user_settings,
)
from core.tasks import (
    dispatch_async_job,
    process_abuse_report_task,
    send_support_mail_task,
)
from proto import auth_pb2, auth_pb2_grpc
from core.grpc_interceptors import UnifiedServerInterceptor, setup_health_checking

logger = logging.getLogger("watchbloom.services.auth")


def _to_proto_settings(s: dict) -> auth_pb2.UserSettings:
    return auth_pb2.UserSettings(
        user_id=str(s.get("user_id", "")),
        profile_visibility=str(s.get("profile_visibility", "public")),
        show_subscriptions=bool(s.get("show_subscriptions", True)),
        show_liked_videos=bool(s.get("show_liked_videos", False)),
        search_indexing=bool(s.get("search_indexing", True)),
        default_quality=str(s.get("default_quality", "auto")),
        autoplay=bool(s.get("autoplay", True)),
        ambient_mode=bool(s.get("ambient_mode", True)),
        default_playback_rate=float(s.get("default_playback_rate", 1.0)),
        captions_enabled=bool(s.get("captions_enabled", False)),
        captions_language=str(s.get("captions_language", "en")),
        email_notifications=bool(s.get("email_notifications", True)),
        subscriber_alerts=bool(s.get("subscriber_alerts", True)),
        recommendation_alerts=bool(s.get("recommendation_alerts", True)),
        security_alerts=bool(s.get("security_alerts", True)),
        updated_at=str(s.get("updated_at", "")),
    )


def _to_proto_notification(n: dict) -> auth_pb2.NotificationItem:
    return auth_pb2.NotificationItem(
        id=str(n.get("id", "")),
        user_id=str(n.get("user_id", "")),
        title=str(n.get("title", "")),
        message=str(n.get("message", "")),
        type=str(n.get("type", "info")),
        is_read=bool(n.get("is_read", False)),
        metadata_json=str(n.get("metadata_json", "{}")),
        created_at=str(n.get("created_at", "")),
    )


class AuthServiceServicer(auth_pb2_grpc.AuthServiceServicer):
    """gRPC Servicer for Watchbloom Authentication & RBAC."""

    def Authenticate(self, request, context):
        username = request.username.strip()
        password = request.password or None
        requested_role = request.role.strip().lower() or Role.CREATOR

        auth_user = authenticate_user(username, password=password)
        if password is not None and auth_user is None:
            return auth_pb2.AuthResponse(
                success=False,
                error="Unauthorized: Invalid credentials",
            )

        if auth_user:
            uid = auth_user["id"]
            role = auth_user["role"]
            perms = auth_user["permissions"]
        else:
            role = requested_role if requested_role in (Role.ADMIN, Role.CREATOR, Role.VIEWER, Role.USER) else Role.CREATOR
            uid = f"usr_{role}_{username}"
            perms = get_permissions_for_role(role)

        token = generate_token(user_id=uid, username=username, role=role)
        pb_user = auth_pb2.User(
            id=uid,
            username=username,
            role=role,
            permissions=perms,
        )

        return auth_pb2.AuthResponse(
            success=True,
            token=token,
            token_type="Bearer",
            expires_in=86400,
            user=pb_user,
        )

    def VerifyToken(self, request, context):
        payload = decode_token(request.token)
        if not payload:
            return auth_pb2.VerifyResponse(valid=False, error="Invalid or expired token")

        pb_user = auth_pb2.User(
            id=str(payload.get("sub", "")),
            username=str(payload.get("name", "")),
            role=str(payload.get("role", Role.ANONYMOUS)),
            permissions=payload.get("permissions", []),
        )
        return auth_pb2.VerifyResponse(valid=True, user=pb_user)

    def RegisterUser(self, request, context):
        username = request.username.strip()
        password = request.password
        role = request.role.strip().lower() or Role.VIEWER

        if not username or not password:
            return auth_pb2.AuthResponse(success=False, error="Username and password required")

        user = register_user(username=username, password=password, role=role)
        if not user:
            return auth_pb2.AuthResponse(success=False, error="Conflict: Username already registered")

        token = generate_token(user_id=user["id"], username=user["username"], role=user["role"])
        pb_user = auth_pb2.User(
            id=user["id"],
            username=user["username"],
            role=user["role"],
            permissions=user.get("permissions", []),
        )
        return auth_pb2.AuthResponse(
            success=True,
            token=token,
            token_type="Bearer",
            expires_in=86400,
            user=pb_user,
        )

    def RevokeToken(self, request, context):
        success = revoke_token(request.token)
        return auth_pb2.RevokeResponse(
            success=success,
            message="Token revoked successfully" if success else "Invalid token",
        )

    def GetUserProfile(self, request, context):
        payload = decode_token(request.token)
        if not payload:
            return auth_pb2.ProfileResponse(authenticated=False, error="Invalid token")

        pb_user = auth_pb2.User(
            id=str(payload.get("sub", "")),
            username=str(payload.get("name", "")),
            role=str(payload.get("role", Role.ANONYMOUS)),
            permissions=payload.get("permissions", []),
        )
        return auth_pb2.ProfileResponse(authenticated=True, user=pb_user)

    def GetUserSettings(self, request, context):
        uid = request.user_id.strip() or "anonymous"
        settings = get_or_create_user_settings(uid)
        return auth_pb2.UserSettingsResponse(
            success=True,
            settings=_to_proto_settings(settings),
        )

    def UpdateUserSettings(self, request, context):
        uid = request.user_id.strip() or "anonymous"
        st = request.settings
        updates = {
            "profile_visibility": st.profile_visibility or "public",
            "show_subscriptions": st.show_subscriptions,
            "show_liked_videos": st.show_liked_videos,
            "search_indexing": st.search_indexing,
            "default_quality": st.default_quality or "auto",
            "autoplay": st.autoplay,
            "ambient_mode": st.ambient_mode,
            "default_playback_rate": st.default_playback_rate or 1.0,
            "captions_enabled": st.captions_enabled,
            "captions_language": st.captions_language or "en",
            "email_notifications": st.email_notifications,
            "subscriber_alerts": st.subscriber_alerts,
            "recommendation_alerts": st.recommendation_alerts,
            "security_alerts": st.security_alerts,
        }
        res = update_user_settings(uid, updates)
        return auth_pb2.UserSettingsResponse(
            success=True,
            settings=_to_proto_settings(res),
        )

    def SubmitAbuseReport(self, request, context):
        rep = create_abuse_report(
            reporter_id=request.reporter_id,
            target_type=request.target_type,
            target_id=request.target_id,
            reason_code=request.reason_code,
            description=request.description,
            target_metadata=request.target_metadata,
        )
        job_id, is_async = dispatch_async_job(
            process_abuse_report_task,
            rep["report_id"],
            request.reporter_id,
            request.target_type,
            request.target_id,
            request.reason_code,
            request.description,
            request.target_metadata,
        )
        return auth_pb2.AbuseReportResponse(
            success=True,
            report_id=rep["report_id"],
            status="pending",
            is_async=is_async,
            message="Abuse report queued for review.",
        )

    def SubmitSupportMail(self, request, context):
        mail = create_support_mail(
            user_id=request.user_id,
            sender_email=request.sender_email,
            subject=request.subject,
            category=request.category,
            message=request.message,
        )
        job_id, is_async = dispatch_async_job(
            send_support_mail_task,
            mail["mail_id"],
            request.user_id,
            request.sender_email,
            request.subject,
            request.category,
            request.message,
        )
        return auth_pb2.SupportMailResponse(
            success=True,
            mail_id=mail["mail_id"],
            status="queued",
            is_async=is_async,
            message="Support inquiry queued.",
        )

    def GetNotificationLogs(self, request, context):
        uid = request.user_id.strip() or "anonymous"
        res = get_user_notifications(
            uid,
            limit=request.limit or 20,
            offset=request.offset or 0,
            unread_only=request.unread_only,
        )
        pb_notifs = [_to_proto_notification(n) for n in res["notifications"]]
        return auth_pb2.NotificationLogsResponse(
            success=True,
            notifications=pb_notifs,
            total=res["total"],
            unread_count=res["unread_count"],
        )

    def MarkNotificationRead(self, request, context):
        uid = request.user_id.strip()
        success = mark_notification_read(uid, request.notification_id.strip())
        return auth_pb2.MarkNotificationResponse(
            success=success,
            message="Notification marked read" if success else "Notification not found",
        )


from typing import Any
def serve(port: int = 50051, host: str = "0.0.0.0") -> Any:
    interceptors: list[grpc.ServerInterceptor] = [UnifiedServerInterceptor(service_name="auth-service")]
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=interceptors,
    )
    auth_pb2_grpc.add_AuthServiceServicer_to_server(AuthServiceServicer(), server)
    setup_health_checking(server, ["watchbloom.auth.AuthService"])
    try:
        bound_port = server.add_insecure_port(f"{host}:{port}")
        if bound_port == 0 and port != 0:
            bound_port = server.add_insecure_port("127.0.0.1:0")
    except Exception:
        bound_port = server.add_insecure_port("127.0.0.1:0")
    server.start()
    actual_port = bound_port if bound_port > 0 else port
    setattr(server, "bound_port", actual_port)
    logger.info(f"Auth gRPC Service started on port {actual_port} with health checking & tracing interceptors")
    return server


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    srv = serve(50051)
    srv.wait_for_termination()
