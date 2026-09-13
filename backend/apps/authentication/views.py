from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
import uuid
from companies.models import Company
from .serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    VerifyEmailSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    GoogleAuthSerializer,
    UserSerializer
)
from .services import AuthService
from candidates.resume_builder import seed_starter_resume

User = get_user_model()

class RegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            AuthService.log_activity(user, "User registered an account", request)
            return Response({
                "message": "Registration successful! Please check your email for the verification code.",
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            # Audit log login
            email = request.data.get('email')
            try:
                user = User.objects.get(email=email)
                AuthService.log_activity(user, "User logged in", request)
            except User.DoesNotExist:
                pass
        return response


class VerifyEmailView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            AuthService.log_activity(user, "Email verified successfully", request)
            
            # Generate JWT tokens directly so they are logged in after verification
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Email verified successfully! You are now logged in.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResendOTPView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"email": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
            if user.is_verified:
                return Response({"message": "Email is already verified."}, status=status.HTTP_400_BAD_REQUEST)
                
            otp = AuthService.generate_otp(user)
            AuthService.send_verification_email(user, otp)
            AuthService.log_activity(user, "Requested verification email resend", request)
            
            return Response({"message": "Verification code resent successfully."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            # Return 200/success anyway to prevent user enumeration
            return Response({"message": "Verification code resent if email exists."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ForgotPasswordView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get('email')
            try:
                user = User.objects.get(email=email)
                AuthService.send_password_reset_email(user, request)
                AuthService.log_activity(user, "Requested password reset OTP", request)
            except User.DoesNotExist:
                # Do not disclose user presence
                pass
            return Response({
                "message": "If this email is registered, a password reset code has been sent."
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            AuthService.log_activity(user, "Password reset successfully", request)
            return Response({
                "message": "Password reset successfully! You can now log in with your new password."
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GoogleLoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if serializer.is_valid():
            google_user = serializer.validated_data['google_user']
            role = serializer.validated_data['role']
            email = google_user['email']
            
            # Check if user exists, otherwise create
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'role': role,
                    'is_verified': True, # Google emails are already pre-verified
                }
            )
            
            # Update profile names if user was just created or didn't have names
            profile = user.profile
            if not profile.first_name:
                profile.first_name = google_user.get('first_name', '')
                profile.last_name = google_user.get('last_name', '')
                profile.save()
            if role == 'candidate':
                seed_starter_resume(user.candidate_profile, google_user.get('first_name', ''), google_user.get('last_name', ''), demo=False)
            
            AuthService.log_activity(user, "Google OAuth Login/Signup", request)
            
            # Generate local JWT tokens
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "is_new_user": created
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DemoLoginView(APIView):
    """Provide a fresh non-personal demo account on every request."""
    permission_classes = (AllowAny,)

    def post(self, request):
        role = request.data.get('role')
        if role not in ('candidate', 'recruiter'):
            return Response(
                {'role': 'Choose either candidate or recruiter for the demo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = f"demo.{role}.{uuid.uuid4()}@careerkonnect.local"
        user = User.objects.create_user(
            email=email,
            role=role,
            is_verified=True,
            is_demo=True,
        )
        user.set_unusable_password()
        user.save()

        profile = user.profile
        profile.first_name = 'Demo'
        profile.last_name = role.title()

        if role == 'candidate':
            candidate = user.candidate_profile
            candidate.headline = 'Python Full Stack Developer'
            candidate.target_job_title = 'Python Full Stack Developer'
            candidate.skills = ['Python', 'Django', 'Django REST Framework', 'React', 'TypeScript', 'PostgreSQL']
            candidate.summary = 'Demo candidate profile for showcasing CareerKonnect resume generation and ATS analysis.'
            candidate.save()
            seed_starter_resume(candidate, 'Demo', 'Candidate', demo=True)
        else:
            # Give every recruiter demo session its own company so previous
            # demo-created jobs never leak into a later demo session.
            company_slug = f"careerkonnect-demo-{uuid.uuid4().hex[:12]}"
            company = Company.objects.create(
                slug=company_slug,
                name='CareerKonnect Demo',
                industry='Technology',
                location='Remote',
                is_verified=True,
            )
            profile.company = company

        profile.save()
        AuthService.log_activity(user, f"{role.title()} demo login", request)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
                
            token = RefreshToken(refresh_token)
            token.blacklist()
            AuthService.log_activity(request.user, "User logged out", request)
            return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Token is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)


class AuthConfigView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({
            "google_client_id": getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
        }, status=status.HTTP_200_OK)
