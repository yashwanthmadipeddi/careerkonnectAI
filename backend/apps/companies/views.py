from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Company, CompanyVerification
from .serializers import CompanySerializer, CompanyVerificationSerializer
from users.permissions import IsAdminRole, IsRecruiterOrCompanyRole
from authentication.services import AuthService

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    lookup_field = 'slug'

    def get_queryset(self):
        # Company verification is informational only; it does not gate posting
        # or discovery. All companies are listable so newly created (and
        # therefore unverified) companies remain visible to candidates.
        return Company.objects.all()

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            permission_classes = [permissions.IsAuthenticated, IsRecruiterOrCompanyRole]
        else: # update, partial_update, destroy
            permission_classes = [permissions.IsAuthenticated, IsRecruiterOrCompanyRole]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        company = serializer.save()
        
        # Link current user's profile to this company
        profile = self.request.user.profile
        profile.company = company
        profile.save()
        
        AuthService.log_activity(self.request.user, f"Created company profile: {company.name}", self.request)

    def perform_update(self, serializer):
        company = self.get_object()
        # Enforce that only members of the company can edit it
        if self.request.user.role != 'admin' and self.request.user.profile.company != company:
            self.permission_denied(self.request, message="You do not have permission to edit this company.")
        
        serializer.save()
        AuthService.log_activity(self.request.user, f"Updated company profile: {company.name}", self.request)


class CompanyVerificationView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsRecruiterOrCompanyRole)

    def post(self, request):
        """Submit documentation for company verification."""
        profile = request.user.profile
        if not profile.company:
            return Response({"error": "You must link your account to a Company first."}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = CompanyVerificationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Check for existing pending request
            if CompanyVerification.objects.filter(company=profile.company, status='pending').exists():
                return Response({"error": "A verification request is already pending review."}, status=status.HTTP_400_BAD_REQUEST)
                
            verification = serializer.save(company=profile.company)
            AuthService.log_activity(request.user, f"Submitted verification docs for: {profile.company.name}", request)
            return Response(CompanyVerificationSerializer(verification).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminVerificationReviewView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsAdminRole)

    def post(self, request, pk):
        """Admin approves or rejects a company verification request."""
        verification = get_object_or_404(CompanyVerification, pk=pk)
        review_status = request.data.get('status')
        review_notes = request.data.get('review_notes', '')

        if review_status not in ['approved', 'rejected']:
            return Response({"error": "Invalid status. Must be 'approved' or 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)

        verification.status = review_status
        verification.review_notes = review_notes
        verification.reviewed_by = request.user
        verification.save()

        # Update the Company is_verified flag accordingly
        company = verification.company
        if review_status == 'approved':
            company.is_verified = True
        else:
            company.is_verified = False
        company.save()

        AuthService.log_activity(request.user, f"Reviewed verification for {company.name} -> {review_status}", request)
        return Response(CompanyVerificationSerializer(verification).data, status=status.HTTP_200_OK)
