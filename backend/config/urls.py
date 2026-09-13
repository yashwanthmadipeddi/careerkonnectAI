from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # CareerKonnect API Endpoints
    path('api/v1/auth/', include('authentication.urls')),
    path('api/v1/users/', include('users.urls')),
    path('api/v1/companies/', include('companies.urls')),
    path('api/v1/candidates/', include('candidates.urls')),
    path('api/v1/jobs/', include('jobs.urls')),
    path('api/v1/interviews/', include('interviews.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/v1/ai/', include('ai_features.urls')),
]

# Serve Static and Media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
