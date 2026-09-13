import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness,
  Eye,
  EyeOff,
  LogIn,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';

export const Login: React.FC = () => {
  const { login, googleLogin, demoLogin, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [hasRealGoogleId, setHasRealGoogleId] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Redirect target after successful login
  const from = location.state?.from?.pathname || null;

  // If a logged-in user opens the login page, log them out first.
  useEffect(() => {
    if (user) {
      logout().catch((err) => {
        console.error('Auto logout on login page mount:', err);
      });
    }
  }, []);

  // Load Google Identity Services when a real Google Client ID exists.
  useEffect(() => {
    let clientId = '';

    api
      .get('/auth/config/')
      .then((res) => {
        clientId = res.data.google_client_id;

        if (
          !clientId ||
          clientId.includes('your_google_client_id_here')
        ) {
          setHasRealGoogleId(false);
          return;
        }

        setHasRealGoogleId(true);

        // Avoid loading the Google script more than once.
        const existingScript = document.querySelector(
          'script[src="https://accounts.google.com/gsi/client"]'
        );

        if (existingScript) {
          initializeGoogle(clientId);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        script.onload = () => {
          initializeGoogle(clientId);
        };

        document.body.appendChild(script);
      })
      .catch((err) => {
        console.error('Could not fetch auth config:', err);
        setHasRealGoogleId(false);
      });

    function initializeGoogle(id: string) {
      const google = (window as any).google;

      if (!google) {
        return;
      }

      const container = document.getElementById('real-google-signin');

      if (!container) {
        return;
      }

      container.innerHTML = '';

      google.accounts.id.initialize({
        client_id: id,
        callback: async (response: any) => {
          setIsSubmitting(true);
          setErrorMessage(null);

          try {
            await googleLogin(response.credential, 'candidate');

            if (from) {
              navigate(from, { replace: true });
            }
          } catch (err) {
            console.error('Google authentication failed:', err);
            setErrorMessage(
              'Google authentication with backend failed.'
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      });

      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: 382,
      });
    }
  }, [googleLogin, from, navigate]);

  // Normal email/password login.
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(
        data.email,
        data.password,
        data.rememberMe
      );

      if (from) {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(
        err?.non_field_errors?.[0] ||
          err?.detail ||
          'Invalid email or password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo login for Candidate or Recruiter.
  const handleDemoLogin = async (
    role: 'candidate' | 'recruiter'
  ) => {
    setIsDemoLoading(true);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await demoLogin(role);

      navigate(`/dashboard/${role}`, {
        replace: true,
      });
    } catch (err) {
      console.error('Demo login failed:', err);

      setErrorMessage(
        'Demo access is unavailable right now. Please try again.'
      );
    } finally {
      setIsDemoLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-darkbg-200">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand-300/20 dark:bg-brand-900/10 blur-[120px]" />

      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-300/20 dark:bg-violet-900/10 blur-[120px]" />

      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-darkbg-100/50 backdrop-blur-md shadow-sm hover:scale-105 transition-all text-slate-600 dark:text-slate-300"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel relative z-10 transition-all duration-300 hover:shadow-glass-light dark:hover:shadow-glass-dark">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-bold text-xl shadow-md">
              K
            </div>

            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-violet-600 dark:from-brand-400 dark:to-violet-400 bg-clip-text text-transparent">
              CareerKonnect
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Welcome Back
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your complete recruitment platform
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        {/* Normal Login Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>

            <input
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Invalid email address',
                },
              })}
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.email
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-slate-200 dark:border-slate-800'
              } bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white`}
            />

            {errors.email && (
              <span className="text-xs text-red-500 mt-1 block">
                {errors.email.message as string}
              </span>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Password
              </label>

              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', {
                  required: 'Password is required',
                })}
                className={`w-full px-4 py-3 pr-11 rounded-xl border ${
                  errors.password
                    ? 'border-red-400 dark:border-red-500'
                    : 'border-slate-200 dark:border-slate-800'
                } bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {errors.password && (
              <span className="text-xs text-red-500 mt-1 block">
                {errors.password.message as string}
              </span>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              {...register('rememberMe')}
              className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
            />

            <label
              htmlFor="rememberMe"
              className="ml-2 text-sm text-slate-600 dark:text-slate-400"
            >
              Remember me on this device
            </label>
          </div>

          {/* Sign In */}
          <button
            type="submit"
            disabled={isSubmitting || isDemoLoading}
            className="w-full py-3.5 px-4 rounded-xl font-bold bg-brand-500 text-white shadow-md hover:bg-brand-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && !isDemoLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>

          <span className="relative px-3 text-xs bg-transparent text-slate-400 dark:text-slate-500 uppercase font-semibold">
            Or
          </span>
        </div>

        {/* Google Login */}
        {hasRealGoogleId && (
          <div className="flex justify-center w-full min-h-[46px] mb-6">
            <div id="real-google-signin" />
          </div>
        )}

        {/* Demo Login */}
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
          <div className="text-center">
            <p className="font-bold text-slate-800 dark:text-slate-100">
              Try the demo
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Explore CareerKonnect as a candidate or recruiter —
              no account needed.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {/* Candidate Demo */}
            <button
              type="button"
              onClick={() =>
                handleDemoLogin('candidate')
              }
              disabled={isSubmitting || isDemoLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-800 dark:bg-darkbg-300 dark:text-brand-300 dark:hover:bg-darkbg-200"
            >
              <UserRound className="h-4 w-4" />
              Candidate
            </button>

            {/* Recruiter Demo */}
            <button
              type="button"
              onClick={() =>
                handleDemoLogin('recruiter')
              }
              disabled={isSubmitting || isDemoLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-800 dark:bg-darkbg-300 dark:text-brand-300 dark:hover:bg-darkbg-200"
            >
              <BriefcaseBusiness className="h-4 w-4" />
              Recruiter
            </button>
          </div>

          {/* Demo Loading */}
          {isDemoLoading && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-brand-600 dark:text-brand-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Starting demo...
            </div>
          )}
        </div>

        {/* Register */}
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          New to CareerKonnect?{' '}

          <Link
            to="/register"
            className="font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};