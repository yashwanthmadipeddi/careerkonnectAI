from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CandidateMeProfileView,
    ExperienceViewSet,
    EducationViewSet,
    ProjectViewSet,
    CertificationViewSet,
    GenerateResumeView
)

router = DefaultRouter()
router.register(r'experiences', ExperienceViewSet, basename='candidate_experience')
router.register(r'educations', EducationViewSet, basename='candidate_education')
router.register(r'projects', ProjectViewSet, basename='candidate_project')
router.register(r'certifications', CertificationViewSet, basename='candidate_certification')

urlpatterns = [
    path('profile/', CandidateMeProfileView.as_view(), name='candidate_profile_me'),
    path('resume/generate/', GenerateResumeView.as_view(), name='candidate_resume_generate'),
    path('', include(router.urls)),
]
