from django.utils import timezone


def _date(value):
    if not value:
        return ''
    try:
        return value.strftime('%b %Y')
    except AttributeError:
        return str(value)


def build_resume_text(candidate):
    profile = getattr(candidate.user, 'profile', None)
    full_name = f"{getattr(profile, 'first_name', '')} {getattr(profile, 'last_name', '')}".strip() or 'CareerKonnect Candidate'
    contact = []
    for value in [
        getattr(profile, 'phone_number', ''),
        getattr(profile, 'linkedin_url', ''),
        getattr(profile, 'github_url', ''),
        getattr(profile, 'portfolio_url', ''),
        candidate.preferred_location,
    ]:
        if value:
            contact.append(str(value))

    lines = [full_name, candidate.target_job_title or candidate.headline or 'Professional Candidate']
    if contact:
        lines.append(' | '.join(contact))
    lines.append('')

    if candidate.career_objective or candidate.summary:
        lines.extend(['PROFESSIONAL SUMMARY', candidate.career_objective or candidate.summary, ''])

    if candidate.skills:
        lines.extend(['SKILLS', ', '.join(str(item) for item in candidate.skills), ''])

    if candidate.experience_years:
        lines.extend(['EXPERIENCE', f"{candidate.experience_years} years of professional experience", ''])

    experiences = list(candidate.experiences.all())
    if experiences:
        lines.extend(['WORK EXPERIENCE'])
        for exp in experiences:
            period = f"{_date(exp.start_date)} - {'Present' if exp.is_current else _date(exp.end_date)}"
            lines.append(f"{exp.role} | {exp.company_name} | {period}")
            if exp.location:
                lines.append(exp.location)
            if exp.description:
                lines.append(exp.description)
        lines.append('')

    educations = list(candidate.educations.all())
    if educations:
        lines.extend(['EDUCATION'])
        for edu in educations:
            level = f"{edu.education_level} | " if edu.education_level else ''
            field = f" in {edu.field_of_study}" if edu.field_of_study else ''
            period = f"{_date(edu.start_date)} - {_date(edu.end_date)}" if edu.end_date else _date(edu.start_date)
            lines.append(f"{level}{edu.degree}{field} | {edu.institution} | {period}")
            if edu.gpa:
                lines.append(f"CGPA / GPA: {edu.gpa}")
            if edu.coursework:
                lines.append(f"Coursework: {edu.coursework}")
            if edu.achievements:
                lines.append(f"Academic achievements: {edu.achievements}")
        lines.append('')

    projects = list(candidate.projects.all())
    if projects:
        lines.extend(['PROJECTS'])
        for project in projects:
            lines.append(f"{project.title}{' | ' + project.role if project.role else ''}")
            if project.description:
                lines.append(project.description)
            if project.link:
                lines.append(project.link)
        lines.append('')

    certifications = list(candidate.certifications.all())
    if certifications:
        lines.extend(['CERTIFICATIONS'])
        for cert in certifications:
            extra = f" | {cert.issue_date.year}" if cert.issue_date else ''
            lines.append(f"{cert.name} | {cert.issuing_organization}{extra}")
        lines.append('')

    if candidate.achievements:
        lines.extend(['ACHIEVEMENTS'])
        lines.extend(f"- {item}" for item in candidate.achievements if str(item).strip())
        lines.append('')

    if candidate.languages:
        lines.extend(['LANGUAGES', ', '.join(str(item) for item in candidate.languages), ''])

    return '\n'.join(line for line in lines).strip()


def save_generated_resume(candidate):
    text = build_resume_text(candidate)
    candidate.generated_resume_text = text
    candidate.resume_raw_text = text
    candidate.resume_generated_at = timezone.now()
    candidate.save(update_fields=['generated_resume_text', 'resume_raw_text', 'resume_generated_at', 'updated_at'])
    return text


def seed_starter_resume(candidate, first_name=None, last_name=None, demo=False):
    profile = getattr(candidate.user, 'profile', None)
    if profile and first_name and not profile.first_name:
        profile.first_name = first_name
        profile.last_name = last_name or ''
        profile.save(update_fields=['first_name', 'last_name', 'updated_at'])

    if not candidate.headline:
        candidate.headline = 'Python Full Stack Developer'
    if not candidate.target_job_title:
        candidate.target_job_title = 'Python Full Stack Developer'
    if not candidate.summary:
        candidate.summary = 'Full-stack software developer focused on Python, Django, React, APIs and cloud-ready web applications.'
    if not candidate.career_objective:
        candidate.career_objective = 'Build reliable, user-focused web applications using modern Python full-stack technologies.'
    if not candidate.skills:
        candidate.skills = ['Python', 'Django', 'Django REST Framework', 'React', 'TypeScript', 'PostgreSQL', 'Git', 'AWS']
    if not candidate.languages:
        candidate.languages = ['English', 'Telugu']
    if not candidate.preferred_location:
        candidate.preferred_location = 'Hyderabad, India'
    if not candidate.work_preference:
        candidate.work_preference = 'Hybrid'
    if demo:
        candidate.experience_years = candidate.experience_years or 2.0
        candidate.achievements = candidate.achievements or ['Built production-style full-stack projects', 'Completed multiple software development projects']

    candidate.save()

    if demo and not candidate.experiences.exists():
        from datetime import date
        candidate.experiences.create(
            company_name='CareerKonnect Labs', role='Python Full Stack Developer', location='Remote',
            start_date=date(2024, 1, 1), is_current=True,
            description='Built Django REST APIs, React interfaces, PostgreSQL-backed workflows and AI-assisted candidate features.'
        )
    if demo and not candidate.educations.exists():
        from datetime import date
        candidate.educations.create(
            institution='Demo Institute of Technology', degree='B.Tech', field_of_study='Computer Science',
            education_level='Undergraduate', start_date=date(2021, 8, 1), end_date=date(2025, 5, 31),
            gpa='8.4', coursework='Data Structures, DBMS, Web Development, Machine Learning',
            achievements='Dean\'s list and hackathon finalist'
        )
    if demo and not candidate.projects.exists():
        candidate.projects.create(title='CareerKonnect', role='Full Stack Developer', description='A full-stack recruitment platform with candidate profiles, recruiter job posting, applications and AI career preparation.')
        candidate.projects.create(title='AI Resume Analyzer', role='Developer', description='Analyzes resumes for ATS compatibility, missing skills, keywords and improvement recommendations.')
    if demo and not candidate.certifications.exists():
        from datetime import date
        candidate.certifications.create(name='AWS Practitioner Essentials', issuing_organization='AWS', issue_date=date(2025, 6, 1))

    return save_generated_resume(candidate)
