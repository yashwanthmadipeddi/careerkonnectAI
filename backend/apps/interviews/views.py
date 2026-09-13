from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Interview, InterviewNote
from jobs.models import JobApplication
from .serializers import InterviewSerializer, InterviewNoteSerializer
from users.permissions import IsRecruiterOrCompanyRole
from authentication.services import AuthService

class InterviewViewSet(viewsets.ModelViewSet):
    serializer_class = InterviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Interview.objects.all()
        elif user.role == 'candidate':
            # Candidates see interviews scheduled for their job applications
            return Interview.objects.filter(application__candidate=user.candidate_profile)
        elif user.role in ['recruiter', 'company']:
            # Recruiters see interviews for applications at their company
            company = user.profile.company
            if company:
                return Interview.objects.filter(application__job__company=company)
            else:
                return Interview.objects.filter(scheduled_by=user)
        return Interview.objects.none()

    def perform_create(self, serializer):
        application_id = self.request.data.get('application')
        application = get_object_or_404(JobApplication, pk=application_id)
        
        # Enforce that recruiter belongs to the same company posting the job
        user = self.request.user
        if user.role != 'admin' and user.profile.company != application.job.company:
            self.permission_denied(self.request, message="You cannot schedule interviews for other companies.")

        interview = serializer.save(scheduled_by=user)
        
        # Optionally transition application status to 'interviewing'
        if application.status != 'interviewing':
            application.status = 'interviewing'
            application.save()
            
        AuthService.log_activity(user, f"Scheduled interview: {interview.title} for application {application.id}", self.request)

    def perform_update(self, serializer):
        interview = self.get_object()
        user = self.request.user
        if user.role != 'admin' and interview.scheduled_by != user and user.profile.company != interview.application.job.company:
            self.permission_denied(self.request, message="You do not have permission to modify this interview.")
            
        serializer.save()
        AuthService.log_activity(user, f"Updated interview schedule: {interview.title}", self.request)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role != 'admin' and instance.scheduled_by != user and user.profile.company != instance.application.job.company:
            self.permission_denied(self.request, message="You do not have permission to delete this interview.")
            
        title = instance.title
        instance.delete()
        AuthService.log_activity(user, f"Deleted interview: {title}", self.request)


class InterviewNoteView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsRecruiterOrCompanyRole)

    def post(self, request, interview_id):
        """Add notes to an interview."""
        interview = get_object_or_404(Interview, pk=interview_id)
        
        # Check permission (must belong to the company)
        user = request.user
        if user.role != 'admin' and user.profile.company != interview.application.job.company:
            return Response({"error": "You do not have permission to add notes to this interview."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = InterviewNoteSerializer(data=request.data)
        if serializer.is_valid():
            note = serializer.save(interview=interview, author=user)
            AuthService.log_activity(user, f"Added note to interview: {interview.title}", request)
            return Response(InterviewNoteSerializer(note).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
