from rest_framework import serializers
from django.contrib.auth import get_user_model
from jobs.serializers import JobApplicationSerializer
from .models import Interview, InterviewNote

User = get_user_model()

class InterviewNoteSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = InterviewNote
        fields = ('id', 'interview', 'author', 'author_email', 'author_name', 'note', 'created_at', 'updated_at')
        read_only_fields = ('id', 'author', 'created_at', 'updated_at')

    def get_author_name(self, obj):
        profile = obj.author.profile
        return f"{profile.first_name} {profile.last_name}".strip() or obj.author.email


class InterviewSerializer(serializers.ModelSerializer):
    application_details = JobApplicationSerializer(source='application', read_only=True)
    scheduled_by_email = serializers.EmailField(source='scheduled_by.email', read_only=True)
    notes = InterviewNoteSerializer(many=True, read_only=True)

    class Meta:
        model = Interview
        fields = (
            'id', 'application', 'application_details', 'scheduled_by', 'scheduled_by_email', 
            'title', 'description', 'start_time', 'end_time', 'meet_link', 'status', 'notes', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'scheduled_by', 'created_at', 'updated_at')

    def validate(self, attrs):
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError("End time must be after start time.")
            
        return attrs
