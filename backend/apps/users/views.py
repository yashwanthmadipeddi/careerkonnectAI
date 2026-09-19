from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from .models import Profile, AuditLog
from .serializers import ProfileSerializer, UserSerializer, AuditLogSerializer
from authentication.services import AuthService

User = get_user_model()

class UserMeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        """Retrieve current user information along with profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProfileMeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        """Retrieve current profile details."""
        profile = request.user.profile
        serializer = ProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        """Update current profile details, including explicit avatar removal."""
        profile = request.user.profile

        # An explicit null/empty avatar means the user asked to remove the photo.
        if 'avatar' in request.data and not request.data.get('avatar'):
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile.avatar = None
            profile.save(update_fields=['avatar', 'updated_at'])
            AuthService.log_activity(request.user, "Removed profile photo", request)
            return Response(ProfileSerializer(profile).data, status=status.HTTP_200_OK)

        if request.FILES.get('avatar'):
            # Make the upload path explicit and return a useful validation error
            # instead of the generic profile-setup failure.
            serializer = ProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                AuthService.log_activity(request.user, "Updated profile photo", request)
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response({"error": "Unable to save the profile photo.", "fields": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            AuthService.log_activity(request.user, "Updated profile details", request)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AuditLogMeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        """Retrieve audit logs for current user. Admins see all logs."""
        if request.user.role == 'admin':
            logs = AuditLog.objects.all()
        else:
            logs = AuditLog.objects.filter(user=request.user)
            
        # Pagination
        page = self.request.query_params.get('page', 1)
        # Simply return latest 50 logs for simplicity if no pagination wrapper,
        # or we can use django standard pagination. Let's slice the queryset to latest 50.
        logs = logs.order_by('-timestamp')[:50]
        
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
