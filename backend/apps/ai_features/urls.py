from django.urls import path

from .views import (
    AICareerRoadmapView,
    AICoverLetterExportView,
    AICoverLetterView,
    AIInterviewQuestionView,
    AIJobRecommendationsView,
    AIResumeAnalyzerView,
    AISkillGapView,
    AIStatusView,
)

urlpatterns = [
    path('status/', AIStatusView.as_view(), name='ai_status'),
    path('resume-analyzer/', AIResumeAnalyzerView.as_view(), name='ai_resume_analyzer'),
    path('skill-gap/', AISkillGapView.as_view(), name='ai_skill_gap'),
    path('cover-letter/', AICoverLetterView.as_view(), name='ai_cover_letter'),
    path('cover-letter/export/', AICoverLetterExportView.as_view(), name='ai_cover_letter_export'),
    path('job-recommendations/', AIJobRecommendationsView.as_view(), name='ai_job_recommendations'),
    path('interview-generator/', AIInterviewQuestionView.as_view(), name='ai_interview_generator'),
    path('career-roadmap/', AICareerRoadmapView.as_view(), name='ai_career_roadmap'),
]
