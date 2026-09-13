import random
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from users.models import AuditLog

User = get_user_model()

class AuthService:
    @staticmethod
    def generate_otp(user):
        """Generate a 6-digit OTP and set its expiration (15 minutes)."""
        otp = f"{random.randint(100000, 999999)}"
        user.verification_otp = otp
        user.otp_expiry = timezone.now() + timedelta(minutes=15)
        user.save()
        return otp

    @staticmethod
    def send_verification_email(user, otp):
        """Send the email verification OTP to the user's email."""
        subject = "Verify Your CareerKonnect Account"
        message = (
            f"Hi,\n\n"
            f"Thank you for registering on CareerKonnect!\n"
            f"Your 6-digit verification code is: {otp}\n\n"
            f"This code will expire in 15 minutes.\n\n"
            f"Best regards,\n"
            f"The CareerKonnect Team"
        )
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

    @staticmethod
    def verify_otp(user, otp):
        """Verify the OTP. If valid, mark user verified."""
        if not user.verification_otp or not user.otp_expiry:
            return False, "No OTP requested for this user."
        
        if timezone.now() > user.otp_expiry:
            return False, "OTP has expired."
        
        if user.verification_otp != otp:
            return False, "Invalid OTP."
        
        # Mark verified
        user.is_verified = True
        user.verification_otp = None
        user.otp_expiry = None
        user.save()
        return True, "Email verified successfully."

    @staticmethod
    def send_password_reset_email(user, request=None):
        """Generate a reset OTP and email it."""
        otp = AuthService.generate_otp(user)
        subject = "Reset Your CareerKonnect Password"
        message = (
            f"Hi,\n\n"
            f"You requested to reset your password on CareerKonnect.\n"
            f"Your 6-digit reset code is: {otp}\n\n"
            f"This code will expire in 15 minutes.\n\n"
            f"If you did not request this, please ignore this email.\n\n"
            f"Best regards,\n"
            f"The CareerKonnect Team"
        )
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        return True

    @staticmethod
    def verify_google_token(token):
        """
        Verify the Google OAuth JWT token.
        If valid, return user info: email, first_name, last_name, picture
        """
        try:
            # client_id is loaded from settings if available
            client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None)
            
            # verify token
            idinfo = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                audience=client_id,
                clock_skew_in_seconds=10
            )
            
            # Extract claims
            return {
                'email': idinfo.get('email'),
                'first_name': idinfo.get('given_name', ''),
                'last_name': idinfo.get('family_name', ''),
                'picture': idinfo.get('picture', ''),
                'email_verified': idinfo.get('email_verified', False)
            }
        except Exception as e:
            # Return None or throw if invalid token
            print(f"Google Token Verification Error: {e}")
            return None

    @staticmethod
    def log_activity(user, action, request=None):
        """Log a user action in the audit logs."""
        ip = None
        user_agent = ""
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
        AuditLog.objects.create(
            user=user if user.is_authenticated else None,
            action=action,
            ip_address=ip,
            user_agent=user_agent
        )
