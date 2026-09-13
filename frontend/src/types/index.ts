export type UserRole = 'admin' | 'candidate' | 'recruiter' | 'company';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  description?: string;
  industry?: string;
  size: string;
  location?: string;
  is_verified: boolean;
  members_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyVerification {
  id: string;
  company: Company;
  company_name: string;
  document: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_by_email?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  avatar?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  company?: Company;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  is_demo: boolean;
  is_profile_complete: boolean;
  profile: Profile;
  date_joined: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  resume?: string;
  resume_raw_text?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  experience_years: string;
  experiences: Experience[];
  educations: Education[];
  projects: Project[];
  certifications: Certification[];
  created_at: string;
  updated_at: string;
}

export interface Experience {
  id: string;
  company_name: string;
  role: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field_of_study?: string;
  education_level?: string;
  coursework?: string;
  achievements?: string;
  start_date: string;
  end_date?: string;
  gpa?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  role?: string;
  link?: string;
  start_date?: string;
  end_date?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuing_organization: string;
  issue_date: string;
  expiration_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export interface Job {
  id: string;
  company: Company;
  posted_by: string;
  posted_by_email: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  job_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'remote';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead';
  salary_min?: string;
  salary_max?: string;
  currency: string;
  is_active: boolean;
  is_bookmarked?: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  job: Job;
  candidate: Candidate;
  resume?: string;
  cover_letter?: string;
  status: 'applied' | 'screening' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
  ats_score?: number;
  status_history?: { id: string; status: string; timestamp: string; created_at: string; comment?: string; changed_by_email?: string }[];
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  application: string;
  application_details: JobApplication;
  scheduled_by: string;
  scheduled_by_email: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  meet_link?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: InterviewNote[];
  created_at: string;
  updated_at: string;
}

export interface InterviewNote {
  id: string;
  interview: string;
  author: string;
  author_email: string;
  author_name: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user?: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}
