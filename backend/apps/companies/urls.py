from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, CompanyVerificationView, AdminVerificationReviewView

router = DefaultRouter()
router.register(r'profiles', CompanyViewSet, basename='company')

urlpatterns = [
    path('', include(router.urls)),
    path('verify/', CompanyVerificationView.as_view(), name='company_verify'),
    path('verifications/<uuid:pk>/review/', AdminVerificationReviewView.as_view(), name='admin_verification_review'),
]
