from rest_framework import serializers
from django.contrib.auth import get_user_model
from companies.serializers import CompanySerializer
from .models import Profile, AuditLog

User = get_user_model()

class ProfileSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ('id', 'first_name', 'last_name', 'phone_number', 'avatar', 'linkedin_url', 'github_url', 'portfolio_url', 'company', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    is_profile_complete = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'role', 'is_verified', 'is_demo', 'is_profile_complete', 'profile', 'date_joined', 'created_at', 'updated_at')
        read_only_fields = ('id', 'email', 'role', 'is_verified', 'is_demo', 'date_joined', 'created_at', 'updated_at')

    def get_is_profile_complete(self, obj):
        if obj.role == 'admin':
            return True
        elif obj.role == 'candidate':
            try:
                candidate = obj.candidate_profile
                return bool(candidate.headline and len(candidate.skills) > 0)
            except Exception:
                return False
        elif obj.role in ['recruiter', 'company']:
            try:
                return bool(obj.profile.company_id)
            except Exception:
                return False
        return False


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
