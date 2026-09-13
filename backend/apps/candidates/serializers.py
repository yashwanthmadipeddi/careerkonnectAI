from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Candidate, Experience, Education, Project, Certification

User = get_user_model()

class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = '__all__'
        read_only_fields = ('id', 'candidate', 'created_at', 'updated_at')


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = '__all__'
        read_only_fields = ('id', 'candidate', 'created_at', 'updated_at')


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('id', 'candidate', 'created_at', 'updated_at')


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = '__all__'
        read_only_fields = ('id', 'candidate', 'created_at', 'updated_at')


class CandidateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.profile.first_name', read_only=True)
    last_name = serializers.CharField(source='user.profile.last_name', read_only=True)
    avatar = serializers.ImageField(source='user.profile.avatar', read_only=True)
    linkedin_url = serializers.URLField(source='user.profile.linkedin_url', read_only=True)
    github_url = serializers.URLField(source='user.profile.github_url', read_only=True)
    portfolio_url = serializers.URLField(source='user.profile.portfolio_url', read_only=True)
    
    experiences = ExperienceSerializer(many=True, read_only=True)
    educations = EducationSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    certifications = CertificationSerializer(many=True, read_only=True)

    class Meta:
        model = Candidate
        fields = (
            'id', 'email', 'first_name', 'last_name', 'avatar', 'linkedin_url', 'github_url', 'portfolio_url',
            'resume', 'resume_raw_text', 'generated_resume_text', 'resume_generated_at', 'headline', 'summary', 'skills', 'experience_years',
            'target_job_title', 'career_objective', 'languages', 'achievements', 'preferred_location', 'work_preference',
            'experiences', 'educations', 'projects', 'certifications', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'resume_raw_text', 'generated_resume_text', 'resume_generated_at', 'created_at', 'updated_at')
