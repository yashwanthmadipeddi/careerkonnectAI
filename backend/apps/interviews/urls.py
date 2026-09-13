from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InterviewViewSet, InterviewNoteView

router = DefaultRouter()
router.register(r'schedules', InterviewViewSet, basename='interview')

urlpatterns = [
    path('', include(router.urls)),
    path('schedules/<uuid:interview_id>/notes/', InterviewNoteView.as_view(), name='interview_notes'),
]
