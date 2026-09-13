import logging

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.services import AuthService
from jobs.models import Job, JobApplication
from services.document_service import (
    build_cover_letter_docx,
    build_cover_letter_pdf,
    safe_filename_stem,
)
from services.gemini_service import AIServiceError, GeminiService
from services.resume_parser import ResumeParseError, ResumeParser

from .serializers import (
    CareerRoadmapSerializer,
    CoverLetterExportSerializer,
    CoverLetterGeneratorSerializer,
    InterviewGeneratorSerializer,
    ResumeAnalyzerSerializer,
    SkillGapSerializer,
)

logger = logging.getLogger(__name__)


def ai_error_response(exc):
    """Convert an AIServiceError into a structured DRF response."""
    return Response(
        {"success": False, "error": exc.message, "code": exc.code},
        status=exc.status_code,
    )


def parse_error_response(exc):
    """Convert a ResumeParseError into a structured DRF response."""
    return Response(
        {"success": False, "error": exc.message, "code": exc.code},
        status=status.HTTP_400_BAD_REQUEST,
    )


class BaseAIView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    # -- resume -------------------------------------------------------

    def _profile_text(self, candidate):
        """
        Compile a text resume from the candidate's structured profile.

        Used when no file is uploaded and no raw resume text is stored.
        """
        lines = []
        profile = getattr(candidate.user, "profile", None)
        if profile:
            lines.append(f"Name: {profile.first_name} {profile.last_name}".strip())
        if candidate.user.email:
            lines.append(f"Email: {candidate.user.email}")
        if candidate.headline:
            lines.append(f"Headline: {candidate.headline}")
        if candidate.summary:
            lines.append(f"Summary: {candidate.summary}")
        if candidate.skills:
            lines.append(f"Skills: {', '.join(str(s) for s in candidate.skills)}")
        if candidate.experience_years:
            lines.append(f"Years of experience: {candidate.experience_years}")

        experiences = list(candidate.experiences.all())
        if experiences:
            lines.append("\nWork Experience:")
            for exp in experiences:
                end = exp.end_date.strftime('%Y-%m') if exp.end_date else 'Present'
                start = exp.start_date.strftime('%Y-%m') if exp.start_date else ''
                lines.append(f"- {exp.role} at {exp.company_name} ({start} to {end})")
                if exp.description:
                    lines.append(f"  {exp.description}")

        educations = list(candidate.educations.all())
        if educations:
            lines.append("\nEducation:")
            for edu in educations:
                end = edu.end_date.strftime('%Y-%m') if edu.end_date else 'Present'
                lines.append(
                    f"- {edu.degree} in {edu.field_of_study} from {edu.institution} ({end})"
                )

        projects = list(candidate.projects.all())
        if projects:
            lines.append("\nProjects:")
            for proj in projects:
                lines.append(f"- {proj.title} ({proj.role}): {proj.description}")

        certifications = list(candidate.certifications.all())
        if certifications:
            lines.append("\nCertifications:")
            for cert in certifications:
                lines.append(f"- {cert.name} from {cert.issuing_organization}")

        return "\n".join(line for line in lines if line and line.strip())

    def resolve_resume_text(self, request, candidate, validated):
        """
        Resolve the resume text to analyse, in priority order:

        1. A file uploaded with this request (parsed server-side, then
           persisted to the candidate profile).
        2. Previously extracted ``resume_raw_text``.
        3. Text compiled from the structured profile.

        Raises ResumeParseError when an uploaded file is unusable.
        """
        # The profile resume is the single source of truth for AI Career Prep.
        # Re-parse the saved file first so the latest uploaded profile resume is
        # always used. Stored raw text is the fallback for environments where
        # the media file is temporarily unavailable.
        if candidate.resume:
            try:
                with candidate.resume.open("rb") as fh:
                    text = ResumeParser.extract_text(
                        fh, candidate.resume.name, validate=False
                    )
                candidate.resume_raw_text = text
                candidate.save(update_fields=["resume_raw_text", "updated_at"])
                return text
            except Exception as exc:
                logger.warning("Could not re-parse stored resume: %s", exc)

        if candidate.resume_raw_text and candidate.resume_raw_text.strip():
            return candidate.resume_raw_text

        # Backward-compatible support for direct AI requests that still send
        # a resume file. The UI no longer asks candidates to upload here.
        upload = validated.get("resume") or request.FILES.get("resume")
        if upload:
            text = ResumeParser.extract_text(upload, getattr(upload, "name", ""))
            try:
                upload.seek(0)
                candidate.resume = upload
                candidate.resume_raw_text = text
                candidate.save(update_fields=["resume", "resume_raw_text", "updated_at"])
            except Exception as exc:
                logger.warning("Could not persist uploaded resume: %s", exc)
            return text

        return self._profile_text(candidate)

    # -- job ----------------------------------------------------------

    def resolve_job(self, validated):
        """
        Resolve (job_title, job_description, company_name) from the input.

        Returns empty strings when nothing was supplied, which puts the AI
        features into their resume-only mode.
        """
        job_id = validated.get("job_id")
        if job_id:
            job = get_object_or_404(Job, pk=job_id)
            description = (
                f"Job Title: {job.title}\n"
                f"Company: {job.company.name}\n"
                f"Location: {job.location}\n"
                f"Description: {job.description}\n"
                f"Requirements: {job.requirements}"
            )
            return job.title, description, job.company.name

        return (
            (validated.get("job_title") or "").strip(),
            (validated.get("job_description") or "").strip(),
            (validated.get("company_name") or "").strip(),
        )

    def candidate_or_error(self, request):
        """Return the candidate profile, or a 403 Response for other roles."""
        if request.user.role != "candidate":
            return None, Response(
                {
                    "success": False,
                    "error": "Only candidates can use AI Career Prep features.",
                    "code": "role_forbidden",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return request.user.candidate_profile, None


class AIResumeAnalyzerView(BaseAIView):
    """
    Real ATS analysis.

    Mode A (resume only)      - general ATS/resume-quality audit.
    Mode B (resume + job desc) - job-specific ATS match.

    The score always comes from the AI's analysis of the actual input.
    """

    def post(self, request):
        candidate, error = self.candidate_or_error(request)
        if error:
            return error

        serializer = ResumeAnalyzerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "error": "Invalid input.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resume_text = self.resolve_resume_text(request, candidate, serializer.validated_data)
        except ResumeParseError as exc:
            return parse_error_response(exc)

        _, job_description, _ = self.resolve_job(serializer.validated_data)

        try:
            analysis = GeminiService.analyze_resume(resume_text, job_description or None)
        except AIServiceError as exc:
            return ai_error_response(exc)

        # Persist the score onto an existing application for this job, if any.
        job_id = serializer.validated_data.get("job_id")
        if job_id:
            application = JobApplication.objects.filter(
                job_id=job_id, candidate=candidate
            ).first()
            if application:
                application.ats_score = analysis["ats_score"]
                application.save(update_fields=["ats_score", "updated_at"])

        AuthService.log_activity(
            request.user,
            f"Ran AI Resume Analyzer ({analysis['mode']}) - score {analysis['ats_score']}",
            request,
        )
        return Response(analysis, status=status.HTTP_200_OK)


class AISkillGapView(BaseAIView):
    """Skill gap analysis. Works with resume only, or resume + job description."""

    def post(self, request):
        candidate, error = self.candidate_or_error(request)
        if error:
            return error

        serializer = SkillGapSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "error": "Invalid input.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resume_text = self.resolve_resume_text(request, candidate, serializer.validated_data)
        except ResumeParseError as exc:
            return parse_error_response(exc)

        _, job_description, _ = self.resolve_job(serializer.validated_data)

        try:
            analysis = GeminiService.analyze_skill_gap(resume_text, job_description or None)
        except AIServiceError as exc:
            return ai_error_response(exc)

        AuthService.log_activity(
            request.user, f"Ran AI Skill Gap Analysis ({analysis['mode']})", request
        )
        return Response(analysis, status=status.HTTP_200_OK)


class AICoverLetterView(BaseAIView):
    """Generate a personalised cover letter from the candidate's real resume."""

    def post(self, request):
        candidate, error = self.candidate_or_error(request)
        if error:
            return error

        serializer = CoverLetterGeneratorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "error": "Invalid input.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resume_text = self.resolve_resume_text(request, candidate, serializer.validated_data)
        except ResumeParseError as exc:
            return parse_error_response(exc)

        job_title, job_description, company_name = self.resolve_job(serializer.validated_data)

        profile = getattr(request.user, "profile", None)
        candidate_name = ""
        if profile:
            candidate_name = f"{profile.first_name} {profile.last_name}".strip()

        try:
            content = GeminiService.generate_cover_letter(
                resume_text,
                job_description=job_description or None,
                candidate_name=candidate_name or None,
                company_name=company_name or None,
                job_title=job_title or None,
            )
        except AIServiceError as exc:
            return ai_error_response(exc)

        AuthService.log_activity(request.user, "Generated AI Cover Letter", request)
        return Response(
            {
                "success": True,
                "content": content,
                # Kept for backwards compatibility with existing callers.
                "cover_letter": content,
                "mode": "job_match" if job_description else "general",
                "model": GeminiService.get_model_name(),
                "candidate_name": candidate_name,
                "job_title": job_title,
                "company_name": company_name,
            },
            status=status.HTTP_200_OK,
        )


class AICoverLetterExportView(BaseAIView):
    """
    Export a generated cover letter as a real .docx or .pdf download.

    Returns a binary file with the correct Content-Type and
    Content-Disposition, never JSON.
    """

    def post(self, request):
        candidate, error = self.candidate_or_error(request)
        if error:
            return error

        serializer = CoverLetterExportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "error": "Invalid input.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        content = data["content"]
        export_format = data["format"]
        job_title = (data.get("job_title") or "").strip()
        company_name = (data.get("company_name") or "").strip()

        profile = getattr(request.user, "profile", None)
        candidate_name = ""
        if profile:
            candidate_name = f"{profile.first_name} {profile.last_name}".strip()

        stem = safe_filename_stem(candidate_name)
        filename = f"{stem}_Cover_Letter.{export_format}"

        try:
            if export_format == "docx":
                payload = build_cover_letter_docx(
                    content,
                    candidate_name=candidate_name or None,
                    job_title=job_title or None,
                    company_name=company_name or None,
                )
                content_type = (
                    "application/vnd.openxmlformats-officedocument"
                    ".wordprocessingml.document"
                )
            else:
                payload = build_cover_letter_pdf(
                    content,
                    candidate_name=candidate_name or None,
                    job_title=job_title or None,
                    company_name=company_name or None,
                )
                content_type = "application/pdf"
        except RuntimeError as exc:
            logger.error("Document generation dependency missing: %s", exc)
            return Response(
                {"success": False, "error": str(exc), "code": "export_dependency_missing"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            logger.exception("Cover letter export failed: %s", exc)
            return Response(
                {
                    "success": False,
                    "error": "Could not generate the document. Please try again.",
                    "code": "export_failed",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        AuthService.log_activity(
            request.user, f"Downloaded cover letter ({export_format.upper()})", request
        )

        response = HttpResponse(payload, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = str(len(payload))
        # Let the browser read the filename on cross-origin XHR downloads.
        response["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response


class AIJobRecommendationsView(BaseAIView):
    """
    Rank active jobs against the candidate's profile.

    This is deterministic keyword scoring (not an AI call), so it stays fast
    and free. The score is computed from real profile and job data.
    """

    def get(self, request):
        candidate, error = self.candidate_or_error(request)
        if error:
            return error

        candidate_skills = [str(s).lower() for s in (candidate.skills or [])]
        headline = (candidate.headline or "").lower()
        summary = (candidate.summary or "").lower()

        recommendations = []
        for job in Job.objects.filter(is_active=True).select_related("company"):
            job_title = job.title.lower()
            job_desc = (job.description or "").lower()
            job_reqs = (job.requirements or "").lower()

            title_score = 0
            for word in headline.split():
                if len(word) > 2 and word in job_title:
                    title_score += 10
            title_score = min(title_score, 30)

            skills_score = 0
            matched_skills = []
            for skill in candidate_skills:
                if skill and (skill in job_reqs or skill in job_desc):
                    matched_skills.append(skill)
                    skills_score += 15
            skills_score = min(skills_score, 50)

            loc_score = 0
            if 'remote' in job_title or 'remote' in (job.location or '').lower():
                if 'remote' in headline or 'remote' in summary:
                    loc_score = 20

            total_score = min(title_score + skills_score + loc_score, 100)
            if total_score >= 20:
                recommendations.append({
                    "job_id": str(job.id),
                    "title": job.title,
                    "company_name": job.company.name,
                    "company_logo": job.company.logo.url if job.company.logo else None,
                    "location": job.location,
                    "job_type": job.job_type,
                    "salary_min": job.salary_min,
                    "salary_max": job.salary_max,
                    "match_score": total_score,
                    "matched_skills": matched_skills,
                })

        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        AuthService.log_activity(request.user, "Retrieved AI Job Recommendations", request)
        return Response(
            {"success": True, "recommendations": recommendations},
            status=status.HTTP_200_OK,
        )


class AIInterviewQuestionView(BaseAIView):
    def post(self, request):
        serializer = InterviewGeneratorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "error": "Invalid input.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job_title, job_description, _ = self.resolve_job(serializer.validated_data)

        try:
            questions = GeminiService.generate_interview_questions(job_title, job_description)
        except AIServiceError as exc:
            return ai_error_response(exc)

        AuthService.log_activity(request.user, "Generated AI Interview Questions", request)
        return Response(
            {"success": True, "questions": questions}, status=status.HTTP_200_OK
        )


class AICareerRoadmapView(BaseAIView):
    def post(self, request):
        serializer = CareerRoadmapSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "error": "Invalid input.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        skills = []
        if request.user.role == 'candidate':
            skills = request.user.candidate_profile.skills or []

        try:
            roadmap = GeminiService.generate_career_roadmap(
                serializer.validated_data['current_role'],
                serializer.validated_data['target_role'],
                skills,
            )
        except AIServiceError as exc:
            return ai_error_response(exc)

        AuthService.log_activity(request.user, "Generated AI Career Roadmap", request)
        return Response({"success": True, "roadmap": roadmap}, status=status.HTTP_200_OK)


class AIStatusView(APIView):
    """
    Report whether AI features are configured.

    Lets the frontend show an accurate initial state instead of failing on the
    first analyse click. Never exposes the API key itself.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(
            {
                "configured": GeminiService.is_configured(),
                "model": GeminiService.get_model_name(),
            },
            status=status.HTTP_200_OK,
        )
