from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        import users.signals
        
        import sys
        if 'runserver' in sys.argv:
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                keep_emails = [
                    'admin@careerkonnect.ai',
                    'recruiter@careerkonnect.ai',
                    'candidate@careerkonnect.ai'
                ]
                from django.conf import settings
                if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_USER not in keep_emails:
                    keep_emails.append(settings.EMAIL_HOST_USER)
                # Delete any users not in the keep list
                # deleted_count, _ = User.objects.exclude(email__in=keep_emails).delete()
                # if deleted_count > 0:
                #     print(f"\n[Startup Clean] Successfully cleaned database! Wiped {deleted_count} old test user accounts & profiles.\n")
                pass
            except Exception as e:
                print(f"\n[Startup Clean] Cleanup skipped (e.g. database not migrated yet): {e}\n")

