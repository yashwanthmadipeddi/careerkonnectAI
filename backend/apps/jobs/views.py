from rest_framework import viewsets, permissions, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Job, JobApplication, JobBookmark, ApplicationStatusHistory
from .serializers import (
    JobSerializer,
    JobWriteSerializer,
    JobApplicationSerializer,
    JobApplicationWriteSerializer,
    JobBookmarkSerializer,
    ApplicationStatusHistorySerializer
)
from users.permissions import IsCandidateRole, IsRecruiterOrCompanyRole, IsCompanyMember
from authentication.services import AuthService

class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.filter(is_active=True)
    serializer_class = JobSerializer

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return JobWriteSerializer
        return JobSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            # Recruiters/company reps can post immediately. No admin approval
            # and no company verification gate.
            permission_classes = [permissions.IsAuthenticated, IsRecruiterOrCompanyRole, IsCompanyMember]
        else: # update, partial_update, destroy
            permission_classes = [permissions.IsAuthenticated, IsRecruiterOrCompanyRole]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        # Base queryset depends on role
        user = self.request.user
        if user and user.is_authenticated and user.role in ['admin', 'recruiter', 'company']:
            # Recruiters see jobs they posted or their company's jobs
            if user.role == 'admin':
                qs = Job.objects.all()
            else:
                company = user.profile.company
                if company:
                    qs = Job.objects.filter(company=company)
                else:
                    qs = Job.objects.filter(posted_by=user)
        else:
            qs = Job.objects.filter(is_active=True)

        # Filters
        location = self.request.query_params.get('location')
        job_type = self.request.query_params.get('job_type')
        experience_level = self.request.query_params.get('experience_level')
        search_query = self.request.query_params.get('search')
        
        if location:
            qs = qs.filter(location__icontains=location)
        if job_type:
            qs = qs.filter(job_type=job_type)
        if experience_level:
            qs = qs.filter(experience_level=experience_level)
        if search_query:
            qs = qs.filter(
                Q(title__icontains=search_query) | 
                Q(description__icontains=search_query) | 
                Q(requirements__icontains=search_query) |
                Q(company__name__icontains=search_query)
            )
            
        # Sorting
        sort_by = self.request.query_params.get('sort_by', '-created_at')
        if sort_by in ['created_at', '-created_at', 'salary_max', '-salary_max', 'title', '-title']:
            qs = qs.order_by(sort_by)
            
        return qs

    def perform_create(self, serializer):
        job = serializer.save(posted_by=self.request.user)
        AuthService.log_activity(self.request.user, f"Posted job listing: {job.title}", self.request)

    def perform_update(self, serializer):
        job = self.get_object()
        if self.request.user.role != 'admin' and job.posted_by != self.request.user and self.request.user.profile.company != job.company:
            self.permission_denied(self.request, message="You do not own this job listing.")
        
        serializer.save()
        AuthService.log_activity(self.request.user, f"Updated job listing: {job.title}", self.request)

    def perform_destroy(self, instance):
        if self.request.user.role != 'admin' and instance.posted_by != self.request.user and self.request.user.profile.company != instance.company:
            self.permission_denied(self.request, message="You do not own this job listing.")
        
        title = instance.title
        instance.delete()
        AuthService.log_activity(self.request.user, f"Deleted job listing: {title}", self.request)


class JobBookmarkView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsCandidateRole)

    def get(self, request):
        """List all bookmarked jobs for the current candidate."""
        bookmarks = JobBookmark.objects.filter(candidate=request.user.candidate_profile)
        serializer = JobBookmarkSerializer(bookmarks, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Add a job bookmark."""
        job_id = request.data.get('job')
        if not job_id:
            return Response({"job": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        job = get_object_or_404(Job, pk=job_id)
        bookmark, created = JobBookmark.objects.get_or_create(
            candidate=request.user.candidate_profile,
            job=job
        )
        
        if created:
            AuthService.log_activity(request.user, f"Bookmarked job: {job.title}", request)
            return Response(JobBookmarkSerializer(bookmark, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response({"message": "Job is already bookmarked."}, status=status.HTTP_200_OK)

    def delete(self, request):
        """Remove a job bookmark."""
        job_id = request.data.get('job')
        if not job_id:
            return Response({"job": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        bookmark = JobBookmark.objects.filter(candidate=request.user.candidate_profile, job_id=job_id).first()
        if bookmark:
            title = bookmark.job.title
            bookmark.delete()
            AuthService.log_activity(request.user, f"Removed bookmark for: {title}", request)
            return Response({"message": "Bookmark removed successfully."}, status=status.HTTP_200_OK)
        return Response({"error": "Bookmark not found."}, status=status.HTTP_404_NOT_FOUND)


class JobApplicationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return JobApplicationWriteSerializer
        return JobApplicationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return JobApplication.objects.all()
        elif user.role == 'candidate':
            return JobApplication.objects.filter(candidate=user.candidate_profile)
        elif user.role in ['recruiter', 'company']:
            # Return applicants for jobs posted by this company/recruiter
            company = user.profile.company
            if company:
                return JobApplication.objects.filter(job__company=company)
            else:
                return JobApplication.objects.filter(job__posted_by=user)
        return JobApplication.objects.none()

    def perform_create(self, serializer):
        application = serializer.save()
        
        # Track initial status change
        ApplicationStatusHistory.objects.create(
            application=application,
            status='applied',
            changed_by=self.request.user,
            comment="Application submitted successfully."
        )
        AuthService.log_activity(self.request.user, f"Applied for job: {application.job.title}", self.request)

    def destroy(self, request, *args, **kwargs):
        """Withdraw application instead of physical deletion."""
        application = self.get_object()
        if request.user.role != 'admin' and application.candidate.user != request.user:
            self.permission_denied(request, message="You do not own this application.")
            
        if application.status == 'withdrawn':
            return Response({"message": "Application is already withdrawn."}, status=status.HTTP_400_BAD_REQUEST)
            
        application.status = 'withdrawn'
        application.save()
        
        ApplicationStatusHistory.objects.create(
            application=application,
            status='withdrawn',
            changed_by=request.user,
            comment="Application withdrawn by candidate."
        )
        AuthService.log_activity(request.user, f"Withdrew application for: {application.job.title}", request)
        return Response(JobApplicationSerializer(application).data, status=status.HTTP_200_OK)


class JobApplicationStatusUpdateView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsRecruiterOrCompanyRole)

    def patch(self, request, pk):
        """Update job application status and record in history."""
        application = get_object_or_404(JobApplication, pk=pk)
        new_status = request.data.get('status')
        comment = request.data.get('comment', '')

        valid_statuses = [choice[0] for choice in JobApplication.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({"error": f"Invalid status. Must be one of {valid_statuses}."}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure recruiter belongs to the same company
        user = request.user
        if user.role != 'admin' and user.profile.company != application.job.company:
            return Response({"error": "You do not have permission to manage this applicant."}, status=status.HTTP_403_FORBIDDEN)

        application.status = new_status
        application.save()

        # Save history log
        history = ApplicationStatusHistory.objects.create(
            application=application,
            status=new_status,
            changed_by=user,
            comment=comment
        )

        AuthService.log_activity(user, f"Updated application {application.id} status to {new_status}", request)
        return Response(JobApplicationSerializer(application).data, status=status.HTTP_200_OK)
