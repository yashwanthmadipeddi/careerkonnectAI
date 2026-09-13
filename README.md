# CareerKonnect —AI-Powered Recruitment Platform

CareerKonnect is a production-ready, startup-grade Recruitment and Career Management SaaS platform designed to connect **Candidates**, **Recruiters**, **Companies**, and **Administrators** through a modern, web-based experience. Powered by a Django (Python) backend and a React + TypeScript + Tailwind CSS (v3) frontend, the platform uses **Google Gemini AI** to automate resume analyses, cover letter creation, skill gap diagnostics, mock interviews, and career roadmap generation.

---

## Technical Stack & Architecture

### Backend (REST API)
*   **Framework**: Django, Django REST Framework (DRF)
*   **Authentication**: JWT (JSON Web Tokens) with rotation and blacklist via `djangorestframework-simplejwt`
*   **AI Integration**: `google-generativeai` (utilizes native structured JSON generation with Gemini models)
*   **Database**: PostgreSQL (resilientSQLite fallback implemented automatically on local startup)
*   **Audit Trail**: Automated signaling hooks logging user operations, IP addresses, and actions.

### Frontend (SPA Client)
*   **Framework**: Vite + React 18 + TypeScript
*   **Styling**: Tailwind CSS v3 with curated Outfit & Inter typography, dark/light mode toggle, custom scrollbars, and premium glassmorphism utility classes.
*   **Animations**: Framer Motion
*   **Routing**: Protected role-based Route Guards
*   **State Management**: React Context (AuthContext, ThemeContext)

---

## Directory Structure

```text
CareerKonnect/
├── backend/
│   ├── apps/
│   │   ├── candidates/     # Experience, education, projects, skills profiles
│   │   ├── companies/      # Company details & verification workflows
│   │   ├── interviews/     # Scheduler, notes & meeting link management
│   │   ├── jobs/           # Postings, ATS application tracking, bookmarks
│   │   └── users/          # Auth, Profiles, OTP verification, Audit logs
│   ├── config/             # Project settings, URLs, WSGI/ASGI configurations
│   ├── services/           # Gemini AI Structured API & Resume text parser
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     # Sidebar, Header, DashboardLayout, RouteGuard
│   │   │   └── ui/         # Buttons, Spinner, Input, Modal, Card, Badge
│   │   ├── context/        # AuthContext, ThemeContext
│   │   ├── pages/
│   │   │   ├── auth/       # Login, Register, VerifyEmail, Forgot, Reset
│   │   │   ├── candidate/  # CandidateDashboard, AIPrep
│   │   │   ├── recruiter/  # RecruiterDashboard
│   │   │   ├── company/    # CompanyDashboard
│   │   │   ├── admin/      # AdminDashboard
│   │   │   └── common/     # LandingPage, NotFound, Unauthorized
│   │   ├── services/       # Axios API interceptor with token rotation
│   │   └── types/          # Unified TypeScript Interfaces
│   └── tailwind.config.js
└── README.md
```

---

## Quick Start Guide

### 1. Prerequisites
*   Python 3.10+
*   Node.js 18+
*   PostgreSQL (Optional, SQLite is used automatically as fallback)

### 2. Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Activate the pre-configured virtual environment:
    *   **Windows**: `venv\Scripts\activate`
    *   **macOS/Linux**: `source venv/bin/activate`
3.  Install dependencies (if not already installed):
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure environment variables in `.env`:
    ```ini
    SECRET_KEY=your_django_secret_key
    GEMINI_API_KEY=your_google_gemini_api_key
    EMAIL_HOST_USER=your_verification_email@gmail.com
    EMAIL_HOST_PASSWORD=your_app_password
    ```
5.  Run migrations and start the server:
    ```bash
    python manage.py migrate
    python manage.py runserver
    ```

### 3. Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install npm packages:
    ```bash
    npm install
    ```
3.  Configure API endpoint inside environment settings if needed. By default, Axios is wired to point to `http://localhost:8000/api`.
4.  Launch the development server:
    ```bash
    npm run dev
    ```

---

## API Endpoints List

| Endpoint | Method | Authentication | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/register/` | POST | Public | User Registration (Candidate, Recruiter, Admin) |
| `/api/auth/login/` | POST | Public | User Login (Returns Access + Refresh JWT) |
| `/api/auth/token/refresh/` | POST | Public | ROTATE JWT Access Tokens |
| `/api/auth/verify-otp/` | POST | Public | Verify Email OTP |
| `/api/auth/resend-otp/` | POST | Public | Resend OTP Code |
| `/api/auth/google/` | POST | Public | Exchange Google OAuth Token |
| `/api/candidates/profile/` | GET/PUT | Candidate | Get/Update Candidate profile (Uploads Resume) |
| `/api/candidates/experiences/` | GET/POST | Candidate | CRUD for Candidate Work Experience |
| `/api/candidates/educations/` | GET/POST | Candidate | CRUD for Candidate Educations |
| `/api/jobs/listings/` | GET/POST | Recruiter/Public | List and create job postings |
| `/api/jobs/applications/` | GET/POST | Candidate/Recruiter | Manage job application flows |
| `/api/jobs/applications/<id>/status/` | PATCH | Recruiter | Change application stage (Move ATS lane) |
| `/api/interviews/schedules/` | GET/POST | Recruiter/Candidate | Schedule interviews and get meeting links |
| `/api/ai/resume-analyzer/` | POST | Candidate | Gemini ATS score compatibility analysis |
| `/api/ai/skill-gap/` | POST | Candidate | Gap comparison & Course recommendations |
| `/api/ai/cover-letter/` | POST | Candidate | Tailored Cover Letter Generator |
| `/api/ai/interview-generator/` | POST | Candidate | Mock interview questions + model answers |
| `/api/ai/career-roadmap/` | POST | Candidate | Phase timeline milestones & projects roadmap |

---

## Verification & Automated Testing
The backend is packed with 22 unit tests checking models, signals, security audit logs, JWT rotations, Google OAuth flow, and mock Gemini data fallbacks. 

To execute the test suite:
```bash
cd backend
python manage.py test
```
All tests should yield `OK` with zero failures.
