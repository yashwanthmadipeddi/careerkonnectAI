from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import Profile, AuditLog
from authentication.services import AuthService

User = get_user_model()

class AuthTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('auth_register')
        self.login_url = reverse('auth_login')
        self.verify_url = reverse('auth_verify_email')
        self.forgot_url = reverse('auth_forgot_password')
        self.reset_url = reverse('auth_reset_password')
        self.google_url = reverse('auth_google')
        self.demo_url = reverse('auth_demo')
        
        self.user_data = {
            "email": "testcandidate@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "role": "candidate",
            "first_name": "John",
            "last_name": "Doe"
        }

    def test_user_registration_success(self):
        """Test user registration with valid details."""
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)
        
        # Verify user creation
        user = User.objects.get(email=self.user_data["email"])
        self.assertEqual(user.role, "candidate")
        self.assertFalse(user.is_verified)
        self.assertIsNotNone(user.verification_otp)
        
        # Verify profile creation (via signals)
        self.assertEqual(user.profile.first_name, "John")
        self.assertEqual(user.profile.last_name, "Doe")

    def test_user_registration_password_mismatch(self):
        """Test registration fails if passwords do not match."""
        data = self.user_data.copy()
        data["password_confirm"] = "DifferentPassword123!"
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_user_registration_admin_restricted(self):
        """Test public registration for admin role is blocked."""
        data = self.user_data.copy()
        data["role"] = "admin"
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_email_verification_success(self):
        """Test successful email verification using OTP."""
        # Create user
        self.client.post(self.register_url, self.user_data, format='json')
        user = User.objects.get(email=self.user_data["email"])
        otp = user.verification_otp
        
        # Verify OTP
        verify_data = {
            "email": user.email,
            "otp": otp
        }
        response = self.client.post(self.verify_url, verify_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        
        # Check user database record
        user.refresh_from_db()
        self.assertTrue(user.is_verified)
        self.assertIsNone(user.verification_otp)

    def test_email_verification_failure_invalid_otp(self):
        """Test email verification fails with invalid OTP."""
        self.client.post(self.register_url, self.user_data, format='json')
        verify_data = {
            "email": self.user_data["email"],
            "otp": "000000"
        }
        response = self.client.post(self.verify_url, verify_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("otp", response.data)

    def test_login_success(self):
        """Test successful login returns access and refresh tokens."""
        # Create and verify user
        self.client.post(self.register_url, self.user_data, format='json')
        user = User.objects.get(email=self.user_data["email"])
        user.is_verified = True
        user.save()
        
        # Login
        login_data = {
            "email": self.user_data["email"],
            "password": self.user_data["password"]
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], user.email)
        
        # Verify audit log creation
        self.assertTrue(AuditLog.objects.filter(user=user, action="User logged in").exists())

    def test_login_failure_invalid_credentials(self):
        """Test login fails with invalid credentials."""
        self.client.post(self.register_url, self.user_data, format='json')
        login_data = {
            "email": self.user_data["email"],
            "password": "WrongPassword123!"
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_reset_flow(self):
        """Test forgot and reset password flow."""
        # Register user
        self.client.post(self.register_url, self.user_data, format='json')
        user = User.objects.get(email=self.user_data["email"])
        
        # Request forgot password
        forgot_response = self.client.post(self.forgot_url, {"email": user.email}, format='json')
        self.assertEqual(forgot_response.status_code, status.HTTP_200_OK)
        
        # Fetch newly generated reset OTP
        user.refresh_from_db()
        otp = user.verification_otp
        
        # Reset password
        reset_data = {
            "email": user.email,
            "otp": otp,
            "password": "NewSecurePassword456!",
            "password_confirm": "NewSecurePassword456!"
        }
        reset_response = self.client.post(self.reset_url, reset_data, format='json')
        self.assertEqual(reset_response.status_code, status.HTTP_200_OK)
        
        # Verify can login with new password
        login_data = {
            "email": user.email,
            "password": "NewSecurePassword456!"
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_google_login_mock(self):
        """Test Google login using mock bypass validation."""
        google_data = {
            "token": "mock_google_token_for_testing",
            "role": "recruiter"
        }
        response = self.client.post(self.google_url, google_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "mock_google_user@example.com")
        self.assertEqual(response.data["user"]["role"], "recruiter")

    def test_demo_login_supports_candidate_and_recruiter(self):
        initial_count = User.objects.count()
        for role in ('candidate', 'recruiter'):
            response = self.client.post(self.demo_url, {'role': role}, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('access', response.data)
            self.assertIn('refresh', response.data)
            self.assertTrue(response.data['user']['is_verified'])
            self.assertTrue(response.data['user']['is_demo'])
            self.assertEqual(response.data['user']['role'], role)
            self.assertEqual(User.objects.count(), initial_count + 1)
            initial_count = User.objects.count()
