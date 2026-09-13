import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  guestOnly?: boolean;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  allowedRoles, 
  guestOnly = false 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-darkbg-100">
        <div className="flex flex-col items-center gap-4">
          {/* Custom Spinner */}
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Checking credentials...</p>
        </div>
      </div>
    );
  }

  // Guest Only Routes (Login, Register, etc.)
  if (guestOnly) {
    if (user) {
      // Redirect logged-in users to their dashboard based on role
      return <Navigate to={`/dashboard/${user.role}`} replace />;
    }
    return <>{children}</>;
  }

  // Protected Routes
  if (!user) {
    // Redirect to login page and preserve original destination path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Email verification check
  if (!user.is_verified && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />;
  }

  // Profile completeness onboarding gate
  if (!user.is_profile_complete && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  // Role authorization checks
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
