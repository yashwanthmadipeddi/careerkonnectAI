from rest_framework import serializers
from .models import Company, CompanyVerification

class CompanySerializer(serializers.ModelSerializer):
    members_count = serializers.IntegerField(source='members.count', read_only=True)

    class Meta:
        model = Company
        fields = ('id', 'name', 'slug', 'logo', 'website', 'description', 'industry', 'size', 'location', 'is_verified', 'members_count', 'created_at', 'updated_at')
        read_only_fields = ('id', 'slug', 'is_verified', 'created_at', 'updated_at')


class CompanyVerificationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True)

    class Meta:
        model = CompanyVerification
        fields = ('id', 'company', 'company_name', 'document', 'status', 'reviewed_by', 'reviewed_by_email', 'review_notes', 'created_at', 'updated_at')
        read_only_fields = ('id', 'status', 'reviewed_by', 'review_notes', 'created_at', 'updated_at')
