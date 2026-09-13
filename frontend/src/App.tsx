import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { RouteGuard } from './components/layout/RouteGuard';

// Auth pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// Common pages
import { LandingPage } from './pages/common/LandingPage';
import { Unauthorized } from './pages/common/Unauthorized';
import { NotFound } from './pages/common/NotFound';
import { ProfileSetup } from './pages/common/ProfileSetup';

// Dashboards
import { CandidateDashboard } from './pages/candidate/CandidateDashboard';
import { AIPrep } from './pages/candidate/AIPrep';
import { ExploreJobs } from './pages/candidate/ExploreJobs';
import { Applications } from './pages/candidate/Applications';
import { SavedBookmarks } from './pages/candidate/SavedBookmarks';
import { RecruiterDashboard } from './pages/recruiter/RecruiterDashboard';
import { PostJob } from './pages/recruiter/PostJob';
import { ManageJobs } from './pages/recruiter/ManageJobs';
import { ScheduleInterviews } from './pages/recruiter/ScheduleInterviews';
import { CompanyDashboard } from './pages/company/CompanyDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AccountProfile } from './pages/common/AccountProfile';
import { ResumeBuilder } from './pages/common/ResumeBuilder';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Guest Only Auth Routes */}
            <Route 
              path="/login" 
              element={
                <RouteGuard guestOnly>
                  <Login />
                </RouteGuard>
              } 
            />
            <Route 
              path="/register" 
              element={
                <RouteGuard guestOnly>
                  <Register />
                </RouteGuard>
              } 
            />
            <Route 
              path="/forgot-password" 
              element={
                <RouteGuard guestOnly>
                  <ForgotPassword />
                </RouteGuard>
              } 
            />
            <Route 
              path="/reset-password" 
              element={
                <RouteGuard guestOnly>
                  <ResetPassword />
                </RouteGuard>
              } 
            />

            {/* Verification Route (unprotected from login but lock is verified inside RouteGuard) */}
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Mandatory Profile Setup Route */}
            <Route 
              path="/profile-setup" 
              element={
                <RouteGuard>
                  <ProfileSetup />
                </RouteGuard>
              } 
            />

            {/* Protected Role-Based Dashboards */}
            <Route 
              path="/dashboard/candidate" 
              element={
                <RouteGuard allowedRoles={['candidate']}>
                  <CandidateDashboard />
                </RouteGuard>
              } 
            />
            <Route 
              path="/jobs" 
              element={
                <RouteGuard allowedRoles={['candidate']}>
                  <ExploreJobs />
                </RouteGuard>
              } 
            />
            <Route 
              path="/applications" 
              element={
                <RouteGuard allowedRoles={['candidate']}>
                  <Applications />
                </RouteGuard>
              } 
            />
            <Route 
              path="/bookmarks" 
              element={
                <RouteGuard allowedRoles={['candidate']}>
                  <SavedBookmarks />
                </RouteGuard>
              } 
            />
            <Route 
              path="/ai-prep" 
              element={
                <RouteGuard allowedRoles={['candidate']}>
                  <AIPrep />
                </RouteGuard>
              } 
            />
            <Route 
              path="/dashboard/recruiter" 
              element={
                <RouteGuard allowedRoles={['recruiter']}>
                  <RecruiterDashboard />
                </RouteGuard>
              } 
            />

            {/* Recruiter workflow routes.
                These paths must match the sidebar links in DashboardLayout
                exactly, otherwise navigation falls through to /404. */}
            <Route 
              path="/jobs/post" 
              element={
                <RouteGuard allowedRoles={['recruiter', 'company', 'admin']}>
                  <PostJob />
                </RouteGuard>
              } 
            />
            <Route 
              path="/jobs/manage" 
              element={
                <RouteGuard allowedRoles={['recruiter', 'company', 'admin']}>
                  <ManageJobs />
                </RouteGuard>
              } 
            />
            <Route 
              path="/interviews/schedule" 
              element={
                <RouteGuard allowedRoles={['recruiter', 'company', 'admin']}>
                  <ScheduleInterviews />
                </RouteGuard>
              } 
            />

            {/* Account profile (header dropdown target) - all roles */}
            <Route
              path="/resume-builder"
              element={
                <RouteGuard allowedRoles={['candidate']}>
                  <ResumeBuilder />
                </RouteGuard>
              }
            />

            <Route 
              path="/profile" 
              element={
                <RouteGuard>
                  <AccountProfile />
                </RouteGuard>
              } 
            />

            <Route 
              path="/dashboard/company" 
              element={
                <RouteGuard allowedRoles={['company']}>
                  <CompanyDashboard />
                </RouteGuard>
              } 
            />
            <Route 
              path="/company/profile" 
              element={
                <RouteGuard allowedRoles={['company', 'recruiter', 'admin']}>
                  <CompanyDashboard />
                </RouteGuard>
              } 
            />
            <Route 
              path="/dashboard/admin" 
              element={
                <RouteGuard allowedRoles={['admin']}>
                  <AdminDashboard />
                </RouteGuard>
              } 
            />
            <Route 
              path="/admin/verifications" 
              element={
                <RouteGuard allowedRoles={['admin']}>
                  <AdminDashboard />
                </RouteGuard>
              } 
            />
            <Route 
              path="/admin/logs" 
              element={
                <RouteGuard allowedRoles={['admin']}>
                  <AdminDashboard />
                </RouteGuard>
              } 
            />

            {/* Common Fallback Routes */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
