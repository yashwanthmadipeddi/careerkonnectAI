from rest_framework import serializers
from companies.models import Company
from companies.serializers import CompanySerializer
from candidates.serializers import CandidateSerializer
from .models import Job, JobApplication, JobBookmark, ApplicationStatusHistory

class JobSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    posted_by_email = serializers.EmailField(source='posted_by.email', read_only=True)
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = (
            'id', 'company', 'posted_by', 'posted_by_email', 'title', 'description', 'requirements', 
            'location', 'job_type', 'experience_level', 'salary_min', 'salary_max', 'currency', 
            'is_active', 'is_bookmarked', 'expires_at', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'posted_by', 'created_at', 'updated_at')

    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'candidate':
            # Check if current candidate has bookmarked this job
            return JobBookmark.objects.filter(candidate=request.user.candidate_profile, job=obj).exists()
        return False


class JobWriteSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Job
        fields = (
            'id', 'company', 'title', 'description', 'requirements', 'location',
            'job_type', 'experience_level', 'salary_min', 'salary_max', 'currency',
            'is_active', 'expires_at'
        )

    def validate(self, attrs):
        user = self.context['request'].user

        # For recruiters/company reps, use the company linked to their
        # profile when the frontend doesn't explicitly send one.
        company = attrs.get('company')
        if company is None and self.instance is not None:
            company = self.instance.company
        if company is None and user.role != 'admin':
            company = getattr(user.profile, 'company', None)

        if company is None:
            raise serializers.ValidationError({
                "company": "Your recruiter profile must be linked to a company before you can post a job."
            })

        # Recruiters/company reps can only post for their own company.
        if user.role != 'admin' and user.profile.company_id != company.id:
            raise serializers.ValidationError({
                "company": "You can only post jobs for your own company."
            })

        # Company verification is intentionally not required.
        attrs['company'] = company
        return attrs


class JobApplicationSerializer(serializers.ModelSerializer):
    job = JobSerializer(read_only=True)
    candidate = CandidateSerializer(read_only=True)
    status_history = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = ('id', 'job', 'candidate', 'resume', 'cover_letter', 'status', 'ats_score', 'created_at', 'updated_at', 'status_history')
        read_only_fields = ('id', 'status', 'ats_score', 'created_at', 'updated_at')

    def get_status_history(self, obj):
        qs = obj.status_history.select_related('changed_by').order_by('-created_at')
        return ApplicationStatusHistorySerializer(qs, many=True, context=self.context).data


class JobApplicationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = ('id', 'job', 'resume', 'cover_letter', 'status')
        read_only_fields = ('id', 'status')

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user
        
        if user.role != 'candidate':
            raise serializers.ValidationError("Only candidates can apply for jobs.")
            
        job = attrs.get('job')
        if not job.is_active:
            raise serializers.ValidationError("This job listing is no longer active.")
            
        candidate = user.candidate_profile
        if JobApplication.objects.filter(job=job, candidate=candidate).exists():
            raise serializers.ValidationError("You have already applied for this job.")
            
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['candidate'] = request.user.candidate_profile
        
        # If no custom resume uploaded, use Candidate's default profile resume
        if not validated_data.get('resume') and request.user.candidate_profile.resume:
            validated_data['resume'] = request.user.candidate_profile.resume
            
        return super().create(validated_data)


class JobBookmarkSerializer(serializers.ModelSerializer):
    job_details = JobSerializer(source='job', read_only=True)

    class Meta:
        model = JobBookmark
        fields = ('id', 'job', 'job_details', 'created_at')
        read_only_fields = ('id', 'created_at')


class ApplicationStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.EmailField(source='changed_by.email', read_only=True)

    class Meta:
        model = ApplicationStatusHistory
        fields = ('id', 'application', 'status', 'changed_by', 'changed_by_email', 'comment', 'created_at')
        read_only_fields = ('id', 'changed_by', 'created_at')
