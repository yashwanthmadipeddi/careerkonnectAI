from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobViewSet, JobBookmarkView, JobApplicationViewSet, JobApplicationStatusUpdateView

router = DefaultRouter()
router.register(r'listings', JobViewSet, basename='job')
router.register(r'applications', JobApplicationViewSet, basename='job_application')

urlpatterns = [
    path('', include(router.urls)),
    path('bookmarks/', JobBookmarkView.as_view(), name='job_bookmarks'),
    path('applications/<uuid:pk>/status/', JobApplicationStatusUpdateView.as_view(), name='job_application_status_update'),
]
