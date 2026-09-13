from django.urls import path
from .views import UserMeView, ProfileMeView, AuditLogMeView

urlpatterns = [
    path('me/', UserMeView.as_view(), name='users_me'),
    path('me/profile/', ProfileMeView.as_view(), name='users_profile_me'),
    path('me/logs/', AuditLogMeView.as_view(), name='users_logs_me'),
]
