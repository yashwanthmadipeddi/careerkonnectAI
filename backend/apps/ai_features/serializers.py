from rest_framework import serializers


class ResumeAnalyzerSerializer(serializers.Serializer):
    """
    ATS analyser input.

    job_id / job_description are OPTIONAL. When neither is supplied the
    analyser runs in resume-only mode; when one is supplied it runs a
    job-specific match. An optional resume file overrides the stored profile.
    """
    job_id = serializers.UUIDField(required=False, allow_null=True)
    job_description = serializers.CharField(required=False, allow_blank=True)
    resume = serializers.FileField(required=False, allow_null=True)


class SkillGapSerializer(serializers.Serializer):
    """Skill gap input. Job description is optional (two modes)."""
    job_id = serializers.UUIDField(required=False, allow_null=True)
    job_description = serializers.CharField(required=False, allow_blank=True)
    resume = serializers.FileField(required=False, allow_null=True)


class CoverLetterGeneratorSerializer(serializers.Serializer):
    """Cover letter input. Job description is optional."""
    job_id = serializers.UUIDField(required=False, allow_null=True)
    job_description = serializers.CharField(required=False, allow_blank=True)
    job_title = serializers.CharField(required=False, allow_blank=True)
    company_name = serializers.CharField(required=False, allow_blank=True)
    resume = serializers.FileField(required=False, allow_null=True)


class CoverLetterExportSerializer(serializers.Serializer):
    """Input for DOCX/PDF export of an already generated cover letter."""
    content = serializers.CharField(required=True)
    format = serializers.ChoiceField(choices=("docx", "pdf"), required=True)
    job_title = serializers.CharField(required=False, allow_blank=True)
    company_name = serializers.CharField(required=False, allow_blank=True)

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Cover letter content cannot be empty.")
        return value


class InterviewGeneratorSerializer(serializers.Serializer):
    job_id = serializers.UUIDField(required=False, allow_null=True)
    job_title = serializers.CharField(required=False, allow_blank=True)
    job_description = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get('job_id') and not attrs.get('job_title') and not attrs.get('job_description'):
            raise serializers.ValidationError(
                "Provide a job_id, job_title or job_description."
            )
        return attrs


class CareerRoadmapSerializer(serializers.Serializer):
    current_role = serializers.CharField(required=True)
    target_role = serializers.CharField(required=True)
