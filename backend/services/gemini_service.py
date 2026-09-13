"""
Central AI service for CareerKonnect AI.

All AI features (ATS resume analysis, skill gap analysis, cover letter
generation, interview questions, career roadmap) route through this single
service. It talks to Google Gemini via the Generative Language API.

Design rules enforced here:

* The model is configurable through the ``GEMINI_MODEL`` environment variable
  so it can be changed without touching application code.
* The API key is read from Django settings (which reads the environment).
  It is never hardcoded and never exposed to the frontend.
* There are NO mock/fake/placeholder AI responses. If the AI cannot be
  reached or returns something unusable, an ``AIServiceError`` is raised so
  the API layer can return a real error instead of fabricated scores.
* Every JSON payload is parsed and validated before it leaves this module.
"""

import json
import logging
import re

from django.conf import settings

logger = logging.getLogger(__name__)

# Hard ceiling on how much resume/JD text we send upstream. Keeps prompts
# (and therefore latency and token spend) bounded.
MAX_RESUME_CHARS = 15000
MAX_JD_CHARS = 8000

# Default request timeout in seconds for a single AI call.
#
# Chosen against measured latency on a real resume: the "-lite" flash models
# answer in ~2-3s, gemini-3.5-flash in ~9s. Note that "thinking" models such as
# gemini-3.6-flash take 200s+ on the same prompt and will exceed this budget --
# do not set GEMINI_MODEL to one of those for interactive requests.
AI_TIMEOUT_SECONDS = 75

# Fast, JSON-capable default. Overridable with GEMINI_MODEL.
DEFAULT_MODEL = "gemini-3.5-flash-lite"


class AIServiceError(Exception):
    """
    Raised when an AI request cannot be completed successfully.

    ``code`` is a stable, machine-readable identifier the API layer maps to a
    user-facing message. ``status_code`` is the HTTP status the API should use.
    """

    def __init__(self, message, code="ai_error", status_code=503):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def _truncate(text, limit):
    """Trim text to ``limit`` characters on a word boundary where possible."""
    if not text:
        return ""
    text = str(text).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "\n[... truncated ...]"


def _extract_json(raw):
    """
    Parse a JSON object/array out of a model response.

    Gemini normally honours ``response_mime_type=application/json``, but models
    occasionally wrap output in markdown fences or add prose. This recovers the
    payload rather than failing the whole request.
    """
    if raw is None:
        raise AIServiceError(
            "The AI returned an empty response. Please try again.",
            code="ai_empty_response",
        )

    text = str(raw).strip()
    if not text:
        raise AIServiceError(
            "The AI returned an empty response. Please try again.",
            code="ai_empty_response",
        )

    # 1. Straight parse.
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        pass

    # 2. Strip markdown code fences (```json ... ```).
    fenced = re.search(r"```(?:json)?\s*(.+?)\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except (ValueError, TypeError):
            pass

    # 3. Grab the outermost {...} or [...] block.
    for opener, closer in (("{", "}"), ("[", "]")):
        start = text.find(opener)
        end = text.rfind(closer)
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except (ValueError, TypeError):
                continue

    logger.error("Unparseable AI JSON response: %s", text[:500])
    raise AIServiceError(
        "The AI returned a malformed response. Please try again.",
        code="ai_malformed_json",
    )


def clamp_score(value, default=None):
    """
    Coerce an AI-provided score into a valid 0-100 integer.

    Returns ``default`` when the value is missing or non-numeric, so a bad
    score never silently becomes a fabricated number.
    """
    if value is None:
        return default
    try:
        if isinstance(value, str):
            match = re.search(r"-?\d+(?:\.\d+)?", value)
            if not match:
                return default
            value = match.group(0)
        score = int(round(float(value)))
    except (TypeError, ValueError):
        return default
    return max(0, min(100, score))


def _as_str_list(value, limit=40):
    """Normalise an AI field into a clean list of non-empty strings."""
    if value is None:
        return []
    if isinstance(value, str):
        value = [value]
    if isinstance(value, dict):
        value = list(value.values())
    if not isinstance(value, (list, tuple)):
        return []

    out = []
    for item in value:
        if isinstance(item, dict):
            item = (
                item.get("skill")
                or item.get("keyword")
                or item.get("name")
                or item.get("text")
                or item.get("title")
                or json.dumps(item)
            )
        text = str(item).strip()
        if text:
            out.append(text)
    return out[:limit]


class GeminiService:
    """Thin, validated wrapper around the Gemini generative models."""

    # ------------------------------------------------------------------
    # Configuration / transport
    # ------------------------------------------------------------------

    @staticmethod
    def get_model_name():
        """Model id, overridable via the GEMINI_MODEL env var."""
        return getattr(settings, "GEMINI_MODEL", None) or DEFAULT_MODEL

    @staticmethod
    def is_configured():
        """True when a usable (non-placeholder) API key is present."""
        key = getattr(settings, "GEMINI_API_KEY", None)
        if not key or not str(key).strip():
            return False
        lowered = str(key).lower()
        if "your_" in lowered or "_here" in lowered or lowered == "changeme":
            return False
        return True

    @staticmethod
    def _require_configured():
        if not GeminiService.is_configured():
            raise AIServiceError(
                "AI features are not configured on the server. Set GEMINI_API_KEY "
                "in backend/.env and restart the Django server.",
                code="ai_not_configured",
                status_code=503,
            )

    @staticmethod
    def _generate(prompt, as_json=True):
        """
        Send a single prompt to Gemini and return the raw text response.

        Translates provider/transport failures into AIServiceError with a
        specific ``code`` so the frontend can show an actionable message.
        """
        GeminiService._require_configured()

        try:
            import google.generativeai as genai
        except ImportError as exc:  # pragma: no cover - dependency missing
            raise AIServiceError(
                "The AI client library is not installed on the server.",
                code="ai_client_missing",
            ) from exc

        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(GeminiService.get_model_name())

            generation_config = {"temperature": 0.4}
            if as_json:
                generation_config["response_mime_type"] = "application/json"

            response = model.generate_content(
                prompt,
                generation_config=generation_config,
                request_options={"timeout": AI_TIMEOUT_SECONDS},
            )
        except Exception as exc:
            GeminiService._raise_provider_error(exc)

        text = getattr(response, "text", None)
        if not text or not str(text).strip():
            raise AIServiceError(
                "The AI returned an empty response. Please try again.",
                code="ai_empty_response",
            )
        return str(text)

    @staticmethod
    def _raise_provider_error(exc):
        """Map an SDK exception onto a specific AIServiceError."""
        name = type(exc).__name__
        detail = str(exc)
        lowered = detail.lower()
        logger.error("Gemini request failed (%s): %s", name, detail[:600])

        if "api key" in lowered or "api_key" in lowered or name in {
            "PermissionDenied",
            "Unauthenticated",
        }:
            raise AIServiceError(
                "The configured AI API key was rejected. Please check "
                "GEMINI_API_KEY in backend/.env.",
                code="ai_invalid_key",
                status_code=502,
            ) from exc

        if name == "NotFound" or "not found" in lowered or "no longer available" in lowered:
            raise AIServiceError(
                f"The configured AI model '{GeminiService.get_model_name()}' is "
                "unavailable. Set GEMINI_MODEL in backend/.env to a supported model.",
                code="ai_model_unavailable",
                status_code=502,
            ) from exc

        if name in {"ResourceExhausted", "TooManyRequests"} or "quota" in lowered or "rate limit" in lowered:
            raise AIServiceError(
                "The AI service rate limit was reached. Please wait a moment and try again.",
                code="ai_rate_limited",
                status_code=429,
            ) from exc

        if name in {"DeadlineExceeded", "Timeout"} or "timeout" in lowered or "timed out" in lowered:
            raise AIServiceError(
                "The AI request timed out. Please try again.",
                code="ai_timeout",
                status_code=504,
            ) from exc

        if name in {"ServiceUnavailable", "InternalServerError"} or "unavailable" in lowered or "connection" in lowered:
            raise AIServiceError(
                "AI analysis is temporarily unavailable. Please try again shortly.",
                code="ai_unavailable",
                status_code=503,
            ) from exc

        raise AIServiceError(
            "AI analysis failed unexpectedly. Please try again.",
            code="ai_error",
            status_code=502,
        ) from exc

    @staticmethod
    def _require_resume(resume_text):
        """Guard against empty/unreadable resumes before spending an AI call."""
        if not resume_text or not str(resume_text).strip():
            raise AIServiceError(
                "No readable resume content was found. Upload a PDF or DOCX resume, "
                "or complete your profile, then try again.",
                code="resume_empty",
                status_code=400,
            )
        if len(str(resume_text).strip()) < 50:
            raise AIServiceError(
                "The resume text is too short to analyse. Please upload a complete resume.",
                code="resume_too_short",
                status_code=400,
            )

    # ------------------------------------------------------------------
    # ATS resume analysis
    # ------------------------------------------------------------------

    @staticmethod
    def analyze_resume(resume_text, job_description=None):
        """
        Analyse a resume for ATS compatibility.

        Two modes, chosen by whether ``job_description`` is supplied:

        * ``resume_only`` - general resume quality / ATS readability audit.
        * ``job_match``   - resume scored against a specific job description.

        Returns a validated dict. Raises AIServiceError on failure; never
        returns fabricated data.
        """
        GeminiService._require_resume(resume_text)

        resume_text = _truncate(resume_text, MAX_RESUME_CHARS)
        job_description = _truncate(job_description, MAX_JD_CHARS)
        mode = "job_match" if job_description else "resume_only"

        if mode == "job_match":
            prompt = (
                "You are a strict, experienced ATS (Applicant Tracking System) and "
                "technical recruiter. Score the candidate's resume against the target "
                "job description.\n\n"
                "Judge on: matching skills, missing skills, matching keywords, missing "
                "keywords, relevant experience depth, job-specific terminology, "
                "education requirements, years-of-experience requirements, technologies, "
                "and responsibility overlap.\n\n"
                "Base every judgement strictly on the supplied text. Never invent "
                "experience the resume does not contain. Be honest: a weak match must "
                "receive a low score.\n\n"
                f"=== RESUME ===\n{resume_text}\n\n"
                f"=== TARGET JOB DESCRIPTION ===\n{job_description}\n\n"
                "Respond with JSON only, using exactly these keys:\n"
                "{\n"
                '  "ats_score": integer 0-100 (match against THIS job),\n'
                '  "resume_score": integer 0-100 (standalone resume quality),\n'
                '  "match_analysis": "2-4 sentence honest summary of alignment and gaps",\n'
                '  "matched_skills": ["skills in BOTH resume and job"],\n'
                '  "missing_skills": ["skills the job needs that the resume lacks"],\n'
                '  "matched_keywords": ["ATS keywords present in the resume"],\n'
                '  "missing_keywords": ["important ATS keywords absent from the resume"],\n'
                '  "skills_detected": ["all skills detected in the resume"],\n'
                '  "strengths": ["concrete strengths for this role"],\n'
                '  "weaknesses": ["concrete weaknesses for this role"],\n'
                '  "formatting_issues": ["ATS parsing/formatting problems, [] if none"],\n'
                '  "missing_sections": ["expected resume sections that are absent"],\n'
                '  "improvement_suggestions": ["specific, actionable rewrite advice"]\n'
                "}"
            )
        else:
            prompt = (
                "You are a strict, experienced ATS (Applicant Tracking System) auditor "
                "and technical resume reviewer. No target job was supplied, so perform a "
                "general ATS-readiness and resume-quality audit.\n\n"
                "Judge on: resume structure and section completeness, contact "
                "information, professional summary, skills coverage, experience "
                "descriptions, education, keyword quality, use of strong action verbs, "
                "presence of measurable/quantified achievements, ATS readability, "
                "formatting, and internal consistency.\n\n"
                "Base every judgement strictly on the supplied text. Never invent "
                "content. Be honest: a weak resume must receive a low score.\n\n"
                f"=== RESUME ===\n{resume_text}\n\n"
                "Respond with JSON only, using exactly these keys:\n"
                "{\n"
                '  "ats_score": integer 0-100 (overall ATS compatibility),\n'
                '  "resume_score": integer 0-100 (overall resume quality),\n'
                '  "match_analysis": "2-4 sentence honest overall assessment",\n'
                '  "skills_detected": ["all skills detected in the resume"],\n'
                '  "matched_keywords": ["strong industry keywords already present"],\n'
                '  "missing_keywords": ["valuable keywords that are absent"],\n'
                '  "strengths": ["concrete strengths of this resume"],\n'
                '  "weaknesses": ["concrete weaknesses of this resume"],\n'
                '  "formatting_issues": ["ATS parsing/formatting problems, [] if none"],\n'
                '  "missing_sections": ["expected resume sections that are absent"],\n'
                '  "improvement_suggestions": ["specific, actionable rewrite advice"]\n'
                "}"
            )

        data = _extract_json(GeminiService._generate(prompt, as_json=True))
        if not isinstance(data, dict):
            raise AIServiceError(
                "The AI returned an unexpected response shape. Please try again.",
                code="ai_malformed_json",
            )

        ats_score = clamp_score(data.get("ats_score"))
        if ats_score is None:
            # Refuse to substitute a made-up number.
            raise AIServiceError(
                "The AI did not return a usable ATS score. Please try again.",
                code="ai_missing_score",
            )

        return {
            "success": True,
            "mode": mode,
            "model": GeminiService.get_model_name(),
            "ats_score": ats_score,
            "resume_score": clamp_score(data.get("resume_score"), default=ats_score),
            "match_analysis": str(data.get("match_analysis") or "").strip(),
            "matched_skills": _as_str_list(data.get("matched_skills")),
            "missing_skills": _as_str_list(data.get("missing_skills")),
            "matched_keywords": _as_str_list(data.get("matched_keywords")),
            "missing_keywords": _as_str_list(data.get("missing_keywords")),
            "skills_detected": _as_str_list(data.get("skills_detected")),
            "strengths": _as_str_list(data.get("strengths")),
            "weaknesses": _as_str_list(data.get("weaknesses")),
            "formatting_issues": _as_str_list(data.get("formatting_issues")),
            "missing_sections": _as_str_list(data.get("missing_sections")),
            "improvement_suggestions": _as_str_list(data.get("improvement_suggestions")),
        }

    # ------------------------------------------------------------------
    # Skill gap analysis
    # ------------------------------------------------------------------

    @staticmethod
    def analyze_skill_gap(resume_text, target_role_description=None):
        """
        Identify skill gaps from a resume, optionally against a target role.

        Modes: ``resume_only`` (career-development view) or ``job_match``
        (compare candidate skills against explicit job requirements).
        """
        GeminiService._require_resume(resume_text)

        resume_text = _truncate(resume_text, MAX_RESUME_CHARS)
        target_role_description = _truncate(target_role_description, MAX_JD_CHARS)
        mode = "job_match" if target_role_description else "resume_only"

        common_shape = (
            "Respond with JSON only, using exactly these keys:\n"
            "{\n"
            '  "matched_skills": ["skills the candidate already demonstrates"],\n'
            '  "partial_skills": ["skills only partially evidenced"],\n'
            '  "missing_skills": [\n'
            '     {"skill": "name", "priority": "High|Medium|Low",\n'
            '      "resource_suggestion": "a specific course, book or project"}\n'
            "  ],\n"
            '  "priority_gaps": ["the most urgent gaps, most important first"],\n'
            '  "technical_skills": ["technical skills detected"],\n'
            '  "soft_skills": ["soft skills detected"],\n'
            '  "recommended_technologies": ["technologies worth learning next"],\n'
            '  "recommendations": ["actionable improvement recommendations"],\n'
            '  "action_plan": ["ordered learning steps to close the gaps"]\n'
            "}"
        )

        if mode == "job_match":
            prompt = (
                "You are a senior technical career coach. Compare the candidate's "
                "skills (from their resume) against the target role's requirements and "
                "produce a rigorous skill gap analysis.\n\n"
                "Classify each relevant skill as already possessed, partially matched, "
                "or missing. Order gaps by importance for this specific role, and give a "
                "sensible learning order. Base everything strictly on the supplied "
                "text; never invent skills.\n\n"
                f"=== RESUME ===\n{resume_text}\n\n"
                f"=== TARGET ROLE / JOB DESCRIPTION ===\n{target_role_description}\n\n"
                + common_shape
            )
        else:
            prompt = (
                "You are a senior technical career coach. No target role was supplied, "
                "so analyse the candidate's current skill profile from their resume and "
                "identify likely gaps for the career direction the resume implies.\n\n"
                "Cover current strengths, technical skills, soft skills, likely skill "
                "gaps, recommended technologies, areas for improvement, and learning "
                "recommendations. Base everything strictly on the supplied text; never "
                "invent skills. Leave 'matched_skills' as the skills they genuinely "
                "already have.\n\n"
                f"=== RESUME ===\n{resume_text}\n\n"
                + common_shape
            )

        data = _extract_json(GeminiService._generate(prompt, as_json=True))
        if not isinstance(data, dict):
            raise AIServiceError(
                "The AI returned an unexpected response shape. Please try again.",
                code="ai_malformed_json",
            )

        # missing_skills keeps its richer object shape; normalise defensively.
        missing = []
        raw_missing = data.get("missing_skills") or []
        if isinstance(raw_missing, dict):
            raw_missing = list(raw_missing.values())
        if isinstance(raw_missing, (list, tuple)):
            for item in raw_missing[:30]:
                if isinstance(item, dict):
                    skill = str(
                        item.get("skill") or item.get("name") or ""
                    ).strip()
                    if not skill:
                        continue
                    priority = str(item.get("priority") or "Medium").strip().title()
                    if priority not in {"High", "Medium", "Low"}:
                        priority = "Medium"
                    missing.append({
                        "skill": skill,
                        "priority": priority,
                        "resource_suggestion": str(
                            item.get("resource_suggestion")
                            or item.get("resource")
                            or ""
                        ).strip(),
                    })
                else:
                    skill = str(item).strip()
                    if skill:
                        missing.append({
                            "skill": skill,
                            "priority": "Medium",
                            "resource_suggestion": "",
                        })

        return {
            "success": True,
            "mode": mode,
            "model": GeminiService.get_model_name(),
            "matched_skills": _as_str_list(data.get("matched_skills")),
            "partial_skills": _as_str_list(data.get("partial_skills")),
            "missing_skills": missing,
            "priority_gaps": _as_str_list(data.get("priority_gaps")),
            "technical_skills": _as_str_list(data.get("technical_skills")),
            "soft_skills": _as_str_list(data.get("soft_skills")),
            "recommended_technologies": _as_str_list(data.get("recommended_technologies")),
            "recommendations": _as_str_list(data.get("recommendations")),
            "action_plan": _as_str_list(data.get("action_plan")),
        }

    # ------------------------------------------------------------------
    # Cover letter
    # ------------------------------------------------------------------

    @staticmethod
    def generate_cover_letter(
        resume_text,
        job_description=None,
        candidate_name=None,
        company_name=None,
        job_title=None,
    ):
        """
        Generate a personalised cover letter from the candidate's real resume.

        Returns plain text. Raises AIServiceError on failure.
        """
        GeminiService._require_resume(resume_text)

        resume_text = _truncate(resume_text, MAX_RESUME_CHARS)
        job_description = _truncate(job_description, MAX_JD_CHARS)

        context = []
        if candidate_name:
            context.append(f"Candidate name: {candidate_name}")
        if job_title:
            context.append(f"Target job title: {job_title}")
        if company_name:
            context.append(f"Target company: {company_name}")
        context_block = "\n".join(context)

        if job_description:
            task = (
                "Write a professional cover letter tailored to the target job "
                "description below. Explicitly connect the candidate's real "
                "achievements to the role's stated requirements."
            )
            jd_block = f"\n=== TARGET JOB DESCRIPTION ===\n{job_description}\n"
        else:
            task = (
                "No job description was supplied. Write a strong general-purpose "
                "professional cover letter based on the candidate's resume and any "
                "job information given, highlighting their strongest real "
                "achievements and clearest career direction."
            )
            jd_block = ""

        prompt = (
            f"You are an expert career writer. {task}\n\n"
            "Rules:\n"
            "- Use ONLY facts present in the resume. Never invent employers, "
            "degrees, metrics or years of experience.\n"
            "- Output the finished letter as plain text, ready to send.\n"
            "- Do NOT include bracketed placeholders such as [Date], [Your Name] "
            "or [Company Address].\n"
            "- Do NOT use markdown, headings or bullet points.\n"
            "- Structure: greeting, a strong opening, two or three body paragraphs "
            "with concrete evidence, a closing paragraph, and a sign-off.\n"
            "- Aim for 250-400 words and a confident, professional tone.\n"
            f"- Sign off with the candidate's name{' (' + candidate_name + ')' if candidate_name else ''}.\n\n"
            f"{context_block}\n"
            f"\n=== CANDIDATE RESUME ===\n{resume_text}\n"
            f"{jd_block}"
        )

        text = GeminiService._generate(prompt, as_json=False).strip()

        # Strip stray markdown fences if the model added them.
        fenced = re.search(r"```(?:\w+)?\s*(.+?)\s*```", text, re.DOTALL)
        if fenced:
            text = fenced.group(1).strip()

        if len(text) < 120:
            raise AIServiceError(
                "The AI returned an unusably short cover letter. Please try again.",
                code="ai_short_response",
            )
        return text

    # ------------------------------------------------------------------
    # Interview questions / career roadmap
    # ------------------------------------------------------------------

    @staticmethod
    def generate_interview_questions(job_title, job_description=None):
        """Generate interview questions for a role. Raises on failure."""
        if not job_title and not job_description:
            raise AIServiceError(
                "A job title or job description is required to generate questions.",
                code="input_missing",
                status_code=400,
            )

        prompt = (
            "You are an experienced technical interviewer. Generate 6 realistic "
            "interview questions for the role below, mixing technical, behavioural "
            "and cultural questions.\n\n"
            f"Job title: {job_title or 'Not specified'}\n"
            f"Job description:\n{_truncate(job_description, MAX_JD_CHARS) or 'Not specified'}\n\n"
            "Respond with JSON only: a top-level array of objects, each with keys "
            '"question", "suggested_answer" and "type" '
            '(type is one of technical, behavioral, cultural).'
        )

        data = _extract_json(GeminiService._generate(prompt, as_json=True))
        if isinstance(data, dict):
            data = data.get("questions") or next(
                (v for v in data.values() if isinstance(v, list)), []
            )
        if not isinstance(data, list) or not data:
            raise AIServiceError(
                "The AI did not return any interview questions. Please try again.",
                code="ai_malformed_json",
            )

        out = []
        for item in data[:12]:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question") or "").strip()
            if not question:
                continue
            qtype = str(item.get("type") or "technical").strip().lower()
            if qtype not in {"technical", "behavioral", "cultural"}:
                qtype = "technical"
            out.append({
                "question": question,
                "suggested_answer": str(item.get("suggested_answer") or "").strip(),
                "type": qtype,
            })

        if not out:
            raise AIServiceError(
                "The AI did not return any usable interview questions. Please try again.",
                code="ai_malformed_json",
            )
        return out

    @staticmethod
    def generate_career_roadmap(current_role, target_role, skills_list=None):
        """Generate a phased career roadmap. Raises on failure."""
        if not current_role or not target_role:
            raise AIServiceError(
                "Both a current role and a target role are required.",
                code="input_missing",
                status_code=400,
            )

        skills = ", ".join(_as_str_list(skills_list)) or "Not specified"
        prompt = (
            "You are a senior career strategist. Build a realistic, phased roadmap "
            f"for moving from '{current_role}' to '{target_role}'.\n"
            f"The candidate's current skills: {skills}\n\n"
            "Respond with JSON only: a top-level array of milestone objects, each with "
            'keys "phase" (e.g. "Month 1-3"), "milestone", "topics_to_learn" (array) '
            'and "recommended_projects" (array).'
        )

        data = _extract_json(GeminiService._generate(prompt, as_json=True))
        if isinstance(data, dict):
            data = data.get("roadmap") or next(
                (v for v in data.values() if isinstance(v, list)), []
            )
        if not isinstance(data, list) or not data:
            raise AIServiceError(
                "The AI did not return a usable roadmap. Please try again.",
                code="ai_malformed_json",
            )

        out = []
        for item in data[:12]:
            if not isinstance(item, dict):
                continue
            milestone = str(item.get("milestone") or "").strip()
            if not milestone:
                continue
            out.append({
                "phase": str(item.get("phase") or "").strip(),
                "milestone": milestone,
                "topics_to_learn": _as_str_list(item.get("topics_to_learn")),
                "recommended_projects": _as_str_list(item.get("recommended_projects")),
            })

        if not out:
            raise AIServiceError(
                "The AI did not return a usable roadmap. Please try again.",
                code="ai_malformed_json",
            )
        return out
