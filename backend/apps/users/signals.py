from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Profile
from candidates.models import Candidate
from candidates.resume_builder import seed_starter_resume

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
        if instance.role == 'candidate':
            candidate = Candidate.objects.create(user=instance)
            seed_starter_resume(candidate, 'Demo' if instance.is_demo else 'Candidate', 'Candidate', demo=instance.is_demo)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # Ensure profile exists in case of edge cases
    if not hasattr(instance, 'profile'):
        Profile.objects.create(user=instance)
    instance.profile.save()
    
    if instance.role == 'candidate' and not hasattr(instance, 'candidate_profile'):
        candidate = Candidate.objects.create(user=instance)
        seed_starter_resume(candidate, 'Demo' if instance.is_demo else 'Candidate', 'Candidate', demo=instance.is_demo)
