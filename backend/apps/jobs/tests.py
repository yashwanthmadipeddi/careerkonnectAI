from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from companies.models import Company
from candidates.models import Candidate
from jobs.models import Job, JobApplication, JobBookmark

User = get_user_model()

class JobListingAPITests(APITestCase):
    def setUp(self):
        # Create a candidate
        self.candidate_user = User.objects.create_user(
            email="candidate@example.com", password="SecurePassword123!", role="candidate", is_verified=True
        )
        
        # Create a recruiter
        self.recruiter_user = User.objects.create_user(
            email="recruiter@example.com", password="SecurePassword123!", role="recruiter", is_verified=True
        )
        
        # Create a company and verify it
        self.company = Company.objects.create(
            name="Google Inc", website="https://google.com", description="Tech Giant", is_verified=True
        )
        
        # Link recruiter to company
        recruiter_profile = self.recruiter_user.profile
        recruiter_profile.company = self.company
        recruiter_profile.save()

        # Create a job listing
        self.job = Job.objects.create(
            company=self.company,
            posted_by=self.recruiter_user,
            title="Software Architect",
            description="Build scalable AI solutions",
            requirements="Python, Django, Gemini API",
            location="Remote",
            job_type="remote",
            experience_level="senior"
        )
        
        # URLs
        self.jobs_list_url = reverse('job-list')
        self.jobs_detail_url = reverse('job-detail', kwargs={'pk': self.job.id})
        self.apply_url = reverse('job_application-list')
        self.bookmark_url = reverse('job_bookmarks')

    def test_anonymous_user_can_list_jobs(self):
        """Test anonymous users can retrieve job listings."""
        response = self.client.get(self.jobs_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # DRF pagination returns a dictionary with 'results' key
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)

    def test_candidate_can_apply_for_job(self):
        """Test candidate can successfully apply for a job."""
        self.client.force_authenticate(user=self.candidate_user)
        
        apply_data = {
            "job": self.job.id,
            "cover_letter": "I would love to build CareerKonnect with you!"
        }
        
        response = self.client.post(self.apply_url, apply_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "applied")
        self.assertEqual(JobApplication.objects.count(), 1)

    def test_recruiter_cannot_apply_for_job(self):
        """Test recruiter is forbidden from applying for jobs."""
        self.client.force_authenticate(user=self.recruiter_user)
        apply_data = {
            "job": self.job.id,
            "cover_letter": "Recruiter trying to apply."
        }
        response = self.client.post(self.apply_url, apply_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recruiter_can_post_job(self):
        """Test recruiter can successfully post a new job."""
        self.client.force_authenticate(user=self.recruiter_user)
        
        job_data = {
            "company": self.company.id,
            "title": "Backend Engineer",
            "description": "Django development",
            "requirements": "Django, REST Framework",
            "location": "New York",
            "job_type": "full_time",
            "experience_level": "mid"
        }
        
        response = self.client.post(self.jobs_list_url, job_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Job.objects.count(), 2)

    def test_unverified_company_recruiter_can_post_job(self):
        """Test recruiter from an unverified company can post jobs."""
        unverified_company = Company.objects.create(name="Shady Corp", is_verified=False)
        self.recruiter_user.profile.company = unverified_company
        self.recruiter_user.profile.save()
        
        self.client.force_authenticate(user=self.recruiter_user)
        
        job_data = {
            "company": unverified_company.id,
            "title": "Suspicious Role",
            "description": "Work from home, send money",
            "requirements": "None",
            "location": "Remote",
            "job_type": "remote",
            "experience_level": "entry"
        }
        
        response = self.client.post(self.jobs_list_url, job_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_recruiter_can_update_application_status(self):
        """Test recruiter can move job application through stages."""
        # Create an application
        application = JobApplication.objects.create(
            job=self.job,
            candidate=self.candidate_user.candidate_profile,
            cover_letter="Cover letter text"
        )
        
        self.client.force_authenticate(user=self.recruiter_user)
        
        status_url = reverse('job_application_status_update', kwargs={'pk': application.id})
        status_data = {
            "status": "interviewing",
            "comment": "Candidate looks promising. Schedule interview."
        }
        
        response = self.client.patch(status_url, status_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        application.refresh_from_db()
        self.assertEqual(application.status, "interviewing")
        self.assertEqual(application.status_history.count(), 1)
        self.assertEqual(application.status_history.first().status, "interviewing")

    def test_candidate_can_bookmark_job(self):
        """Test candidate can bookmark and unbookmark jobs."""
        self.client.force_authenticate(user=self.candidate_user)
        
        # Bookmark
        response = self.client.post(self.bookmark_url, {"job": self.job.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(JobBookmark.objects.filter(candidate=self.candidate_user.candidate_profile, job=self.job).exists())
        
        # Unbookmark
        response = self.client.delete(self.bookmark_url, {"job": self.job.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(JobBookmark.objects.filter(candidate=self.candidate_user.candidate_profile, job=self.job).exists())
