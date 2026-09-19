from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    VerifyEmailView,
    ResendOTPView,
    ForgotPasswordView,
    ResetPasswordView,
    GoogleLoginView,
    DemoLoginView,
    DemoOTPView,
    LogoutView,
    AuthConfigView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('verify-email/', VerifyEmailView.as_view(), name='auth_verify_email'),
    path('resend-otp/', ResendOTPView.as_view(), name='auth_resend_otp'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='auth_reset_password'),
    path('google/', GoogleLoginView.as_view(), name='auth_google'),
    path('demo/', DemoLoginView.as_view(), name='auth_demo'),
    path('demo-otp/', DemoOTPView.as_view(), name='auth_demo_otp'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
    path('config/', AuthConfigView.as_view(), name='auth_config'),
]
