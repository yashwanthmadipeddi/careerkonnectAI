from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from .models import Candidate, Experience, Education, Project, Certification
from .serializers import (
    CandidateSerializer,
    ExperienceSerializer,
    EducationSerializer,
    ProjectSerializer,
    CertificationSerializer
)
from users.permissions import IsCandidateRole, IsRecruiterOrCompanyRole
from authentication.services import AuthService
from .resume_builder import save_generated_resume
from users.serializers import ProfileSerializer

class CandidateMeProfileView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        """Retrieve candidate profile (either the current candidate or by uuid for recruiters)."""
        candidate_id = request.query_params.get('id')
        if candidate_id:
            # Recruiters and Admins can view other candidate profiles
            if request.user.role not in ['recruiter', 'company', 'admin']:
                return Response({"error": "Unauthorized access to candidate profiles."}, status=status.HTTP_403_FORBIDDEN)
            candidate = get_object_or_404(Candidate, pk=candidate_id)
        else:
            if request.user.role != 'candidate':
                return Response({"error": "Profile details not found for this role."}, status=status.HTTP_404_NOT_FOUND)
            candidate = request.user.candidate_profile
            
        serializer = CandidateSerializer(candidate)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        """Update candidate details and optionally the related profile avatar in one request."""
        if request.user.role != 'candidate':
            return Response({"error": "Only candidates can update their profiles."}, status=status.HTTP_403_FORBIDDEN)

        candidate = request.user.candidate_profile
        profile = request.user.profile

        # The avatar belongs to Profile, while the rest of this endpoint updates
        # Candidate. Accepting both in the same multipart request keeps onboarding
        # to one HTTP call and avoids the production-only second-upload failure.
        data = request.data.copy()
        avatar_file = request.FILES.get('avatar')
        avatar_clear = str(data.get('avatar_clear', '')).lower() in {'1', 'true', 'yes', 'on'}
        data.pop('avatar', None)
        data.pop('avatar_clear', None)

        raw_text = None
        if 'resume' in request.FILES:
            resume_file = request.FILES['resume']
            from services.resume_parser import ResumeParser, ResumeParseError
            try:
                raw_text = ResumeParser.extract_text(resume_file, resume_file.name)
            except ResumeParseError as exc:
                return Response(
                    {"error": exc.message, "code": exc.code},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                return Response(
                    {"error": "The resume could not be processed. Please upload a valid PDF or DOCX file."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        candidate_serializer = CandidateSerializer(candidate, data=data, partial=True)
        if not candidate_serializer.is_valid():
            return Response(
                {"error": "Please check your candidate profile details.", "fields": candidate_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate the image through the existing ProfileSerializer before saving.
        avatar_serializer = None
        if avatar_file is not None:
            avatar_serializer = ProfileSerializer(profile, data={'avatar': avatar_file}, partial=True)
            if not avatar_serializer.is_valid():
                return Response(
                    {"error": "Unable to save the profile photo.", "fields": avatar_serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            from django.db import transaction
            with transaction.atomic():
                if raw_text is not None:
                    candidate_serializer.save(resume_raw_text=raw_text)
                else:
                    candidate_serializer.save()

                if avatar_serializer is not None:
                    avatar_serializer.save()
                elif avatar_clear:
                    if profile.avatar:
                        profile.avatar.delete(save=False)
                    profile.avatar = None
                    profile.save(update_fields=['avatar', 'updated_at'])
        except Exception as exc:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("PROFILE PHOTO UPLOAD FAILED")

            return Response(
                {
                    "error": "Unable to save the profile photo.",
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        AuthService.log_activity(request.user, "Updated candidate profile details", request)
        return Response(CandidateSerializer(candidate).data, status=status.HTTP_200_OK)


class GenerateResumeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if request.user.role != 'candidate':
            return Response({"error": "Only candidates can create resumes."}, status=status.HTTP_403_FORBIDDEN)

        candidate = request.user.candidate_profile
        data = request.data
        profile_data = data.get('profile') or {}
        if profile_data:
            profile = request.user.profile
            for field in ('first_name', 'last_name', 'phone_number', 'linkedin_url', 'github_url', 'portfolio_url'):
                if field in profile_data:
                    setattr(profile, field, profile_data.get(field) or '')
            profile.save()

        candidate_fields = (
            'headline', 'summary', 'skills', 'experience_years', 'target_job_title',
            'career_objective', 'languages', 'achievements', 'preferred_location', 'work_preference'
        )
        for field in candidate_fields:
            if field in data:
                setattr(candidate, field, data.get(field))

        candidate.save()

        # Resume builder is the source of truth: replace generated structured details atomically.
        for model_name, key in ((Experience, 'experiences'), (Education, 'educations'), (Project, 'projects'), (Certification, 'certifications')):
            if key in data:
                model_name.objects.filter(candidate=candidate).delete()
                serializer_map = {
                    'experiences': ExperienceSerializer, 'educations': EducationSerializer,
                    'projects': ProjectSerializer, 'certifications': CertificationSerializer,
                }
                serializer = serializer_map[key](data=data.get(key) or [], many=True)
                serializer.is_valid(raise_exception=True)
                for item in serializer.validated_data:
                    model_name.objects.create(candidate=candidate, **item)

        text = save_generated_resume(candidate)
        AuthService.log_activity(request.user, 'Generated resume from profile details', request)
        return Response({
            'success': True,
            'message': 'Resume created and saved to your profile.',
            'resume_text': text,
            'candidate': CandidateSerializer(candidate).data,
        }, status=status.HTTP_200_OK)


class BaseCandidateSubResourceViewSet(viewsets.ModelViewSet):
    """
    Base viewset for Candidate's sub-resources (Experience, Education, etc.).
    Ensures that only the owner can modify, while authenticated members can read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        candidate_id = self.request.query_params.get('candidate_id')
        if candidate_id:
            # Check permissions to view other profiles
            if self.request.user.role not in ['recruiter', 'company', 'admin']:
                self.permission_denied(self.request, message="Unauthorized to view this profile's sub-resources.")
            return self.model_class.objects.filter(candidate_id=candidate_id)
            
        # Default to current user's profile
        if self.request.user.role != 'candidate':
            return self.model_class.objects.none()
        return self.model_class.objects.filter(candidate=self.request.user.candidate_profile)

    def perform_create(self, serializer):
        if self.request.user.role != 'candidate':
            self.permission_denied(self.request, message="Only candidates can add details.")
        serializer.save(candidate=self.request.user.candidate_profile)
        AuthService.log_activity(self.request.user, f"Added detail to {self.model_class.__name__}", self.request)

    def perform_update(self, serializer):
        obj = self.get_object()
        if obj.candidate != self.request.user.candidate_profile:
            self.permission_denied(self.request, message="You do not own this record.")
        serializer.save()
        AuthService.log_activity(self.request.user, f"Updated detail in {self.model_class.__name__}", self.request)

    def perform_destroy(self, instance):
        if instance.candidate != self.request.user.candidate_profile:
            self.permission_denied(self.request, message="You do not own this record.")
        instance.delete()
        AuthService.log_activity(self.request.user, f"Deleted detail from {self.model_class.__name__}", self.request)


class ExperienceViewSet(BaseCandidateSubResourceViewSet):
    model_class = Experience
    serializer_class = ExperienceSerializer


class EducationViewSet(BaseCandidateSubResourceViewSet):
    model_class = Education
    serializer_class = EducationSerializer


class ProjectViewSet(BaseCandidateSubResourceViewSet):
    model_class = Project
    serializer_class = ProjectSerializer


class CertificationViewSet(BaseCandidateSubResourceViewSet):
    model_class = Certification
    serializer_class = CertificationSerializer
