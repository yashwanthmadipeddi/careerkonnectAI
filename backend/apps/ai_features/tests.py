from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from companies.models import Company
from candidates.models import Candidate
from jobs.models import Job

User = get_user_model()

class AIFeatureAPITests(APITestCase):
    def setUp(self):
        # Create a candidate user and populate profile
        self.candidate_user = User.objects.create_user(
            email="candidate-ai@example.com", password="SecurePassword123!", role="candidate", is_verified=True
        )
        self.candidate = self.candidate_user.candidate_profile
        self.candidate.headline = "Python Django Engineer"
        self.candidate.summary = "Passionate about backend APIs"
        self.candidate.skills = ["Python", "Django", "SQL"]
        self.candidate.save()

        # Create a company and a job
        self.company = Company.objects.create(
            name="Google Inc", website="https://google.com", description="Tech Giant", is_verified=True
        )
        self.job = Job.objects.create(
            company=self.company,
            title="Python Django Engineer",
            description="Build scalability into CareerKonnect backend.",
            requirements="Python, Django, SQL, React",
            location="Remote",
            job_type="remote",
            experience_level="mid"
        )
        
        # URLs
        self.analyzer_url = reverse('ai_resume_analyzer')
        self.cover_letter_url = reverse('ai_cover_letter')
        self.skill_gap_url = reverse('ai_skill_gap')
        self.recommendations_url = reverse('ai_job_recommendations')
        self.interview_url = reverse('ai_interview_generator')
        self.roadmap_url = reverse('ai_career_roadmap')

    def test_resume_analyzer_runs_with_job_id(self):
        """Test resume analyzer runs successfully using a job ID."""
        self.client.force_authenticate(user=self.candidate_user)
        
        payload = {
            "job_id": self.job.id
        }
        
        response = self.client.post(self.analyzer_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("ats_score", response.data)
        self.assertIn("improvement_suggestions", response.data)
        self.assertIn("match_analysis", response.data)

    def test_cover_letter_generator_with_raw_description(self):
        """Test cover letter generator runs successfully with raw description text."""
        self.client.force_authenticate(user=self.candidate_user)
        
        payload = {
            "job_description": "We are looking for a Python Django backend developer who likes building clean APIs."
        }
        
        response = self.client.post(self.cover_letter_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("cover_letter", response.data)
        self.assertTrue(len(response.data["cover_letter"]) > 100)

    def test_skill_gap_analyzer(self):
        """Test skill gap analysis runs successfully."""
        self.client.force_authenticate(user=self.candidate_user)
        
        payload = {
            "job_id": self.job.id
        }
        
        response = self.client.post(self.skill_gap_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("matched_skills", response.data)
        self.assertIn("missing_skills", response.data)
        self.assertIn("action_plan", response.data)

    def test_job_recommendations_matching_score(self):
        """Test candidate receives job recommendations ranked by matching logic."""
        self.client.force_authenticate(user=self.candidate_user)
        
        response = self.client.get(self.recommendations_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("recommendations", response.data)
        
        # Recommendations list should match our job
        recs = response.data["recommendations"]
        self.assertTrue(len(recs) >= 1)
        self.assertEqual(recs[0]["title"], self.job.title)
        self.assertTrue(recs[0]["match_score"] > 50)  # matching title, skills: Python, Django, SQL

    def test_interview_question_generator(self):
        """Test interview prep questions can be generated."""
        self.client.force_authenticate(user=self.candidate_user)
        
        payload = {
            "job_id": self.job.id
        }
        
        response = self.client.post(self.interview_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("questions", response.data)
        self.assertTrue(len(response.data["questions"]) >= 1)

    def test_career_roadmap_generator(self):
        """Test career roadmaps are generated properly."""
        self.client.force_authenticate(user=self.candidate_user)
        
        payload = {
            "current_role": "Junior Python Developer",
            "target_role": "Senior Fullstack Engineer"
        }
        
        response = self.client.post(self.roadmap_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("roadmap", response.data)
        self.assertTrue(len(response.data["roadmap"]) >= 1)
