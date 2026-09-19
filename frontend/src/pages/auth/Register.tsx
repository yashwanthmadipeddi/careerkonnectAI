import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserPlus, Eye, EyeOff, Sun, Moon, Briefcase, Award, Building2, UserRound, BriefcaseBusiness } from 'lucide-react';
import type { UserRole } from '../../types';

export const Register: React.FC = () => {
  const { register: registerUser, demoLogin, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      logout().catch(err => console.error("Auto logout on register page mount:", err));
    }
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('candidate');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const passwordVal = watch('password');

  const handleDemoLogin = async (role: 'candidate' | 'recruiter') => {
    setIsDemoLoading(true);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await demoLogin(role);
      navigate(`/dashboard/${role}`, { replace: true });
    } catch (err) {
      console.error('Demo access failed:', err);
      setErrorMessage('Demo access is unavailable right now. Please try again.');
    } finally {
      setIsDemoLoading(false);
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        email: data.email,
        password: data.password,
        password_confirm: data.password_confirm,
        role: selectedRole,
        first_name: data.first_name,
        last_name: data.last_name,
      };
      const registration = await registerUser(payload);

      // The backend returns the OTP for this portfolio/demo build so the
      // recruiter can complete the normal registration flow without email
      // delivery. The OTP is displayed only on the verification page.
      sessionStorage.setItem('careerkonnect_signup_email', data.email);
      if (registration.verification_otp) {
        sessionStorage.setItem('careerkonnect_signup_otp', registration.verification_otp);
      }

      navigate('/verify-email', {
        state: {
          email: data.email,
          otp: registration.verification_otp || '',
        },
      });
    } catch (err: any) {
      setErrorMessage(
        err.email?.[0] || 
        err.password?.[0] || 
        err.non_field_errors?.[0] || 
        err.detail || 
        'Registration failed. Please check inputs.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-darkbg-200 py-12">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand-300/20 dark:bg-brand-900/10 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-300/20 dark:bg-violet-900/10 blur-[120px]"></div>

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 right-6 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-darkbg-100/50 backdrop-blur-md shadow-sm hover:scale-105 transition-all text-slate-600 dark:text-slate-300"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-lg p-8 rounded-2xl glass-panel relative z-10 transition-all duration-300 hover:shadow-glass-light dark:hover:shadow-glass-dark">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-bold text-xl shadow-md">
              K
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-violet-600 dark:from-brand-400 dark:to-violet-400 bg-clip-text text-transparent">
              CareerKonnect
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-sans">Create Account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Get started on your SaaS recruitment journey</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Role Selection Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Candidate Tab */}
              <button
                type="button"
                onClick={() => setSelectedRole('candidate')}
                className={`py-3 px-2.5 rounded-xl border font-semibold text-sm flex flex-col items-center gap-1.5 transition-all ${
                  selectedRole === 'candidate' 
                    ? 'border-brand-500 bg-brand-50/50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 ring-2 ring-brand-500/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-darkbg-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Award className="w-5 h-5" />
                Candidate
              </button>

              {/* Recruiter Tab */}
              <button
                type="button"
                onClick={() => setSelectedRole('recruiter')}
                className={`py-3 px-2.5 rounded-xl border font-semibold text-sm flex flex-col items-center gap-1.5 transition-all ${
                  selectedRole === 'recruiter' 
                    ? 'border-brand-500 bg-brand-50/50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 ring-2 ring-brand-500/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-darkbg-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Briefcase className="w-5 h-5" />
                Recruiter
              </button>

              {/* Company Tab */}
              <button
                type="button"
                onClick={() => setSelectedRole('company')}
                className={`py-3 px-2.5 rounded-xl border font-semibold text-sm flex flex-col items-center gap-1.5 transition-all ${
                  selectedRole === 'company' 
                    ? 'border-brand-500 bg-brand-50/50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 ring-2 ring-brand-500/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-darkbg-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Building2 className="w-5 h-5" />
                Company Rep
              </button>
            </div>
          </div>

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">First Name</label>
              <input 
                type="text" 
                placeholder="John" 
                {...register('first_name', { required: 'Required' })}
                className={`w-full px-4 py-3 rounded-xl border ${errors.first_name ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-800'} bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white`}
              />
              {errors.first_name && <span className="text-xs text-red-500 mt-1 block">{errors.first_name.message as string}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
              <input 
                type="text" 
                placeholder="Doe" 
                {...register('last_name', { required: 'Required' })}
                className={`w-full px-4 py-3 rounded-xl border ${errors.last_name ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-800'} bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white`}
              />
              {errors.last_name && <span className="text-xs text-red-500 mt-1 block">{errors.last_name.message as string}</span>}
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              placeholder="name@company.com" 
              {...register('email', { 
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
              })}
              className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-800'} bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white`}
            />
            {errors.email && <span className="text-xs text-red-500 mt-1 block">{errors.email.message as string}</span>}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Min 8 characters" 
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                })}
                className={`w-full px-4 py-3 pr-11 rounded-xl border ${errors.password ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-800'} bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white`}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <span className="text-xs text-red-500 mt-1 block">{errors.password.message as string}</span>}
          </div>

          {/* Password Confirm Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              {...register('password_confirm', { 
                required: 'Confirm password is required',
                validate: value => value === passwordVal || 'Passwords do not match'
              })}
              className={`w-full px-4 py-3 rounded-xl border ${errors.password_confirm ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-800'} bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white`}
            />
            {errors.password_confirm && <span className="text-xs text-red-500 mt-1 block">{errors.password_confirm.message as string}</span>}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting || isDemoLoading}
            className="w-full py-3.5 px-4 rounded-xl font-bold bg-brand-500 text-white shadow-md hover:bg-brand-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && !isDemoLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Sign Up
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

        {/* Demo access */}
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
          <div className="text-center">
            <p className="font-bold text-slate-800 dark:text-slate-100">
              Try the demo
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDemoLogin('candidate')}
              disabled={isSubmitting || isDemoLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-800 dark:bg-darkbg-300 dark:text-brand-300 dark:hover:bg-darkbg-200"
            >
              <UserRound className="h-4 w-4" />
              Try Candidate Demo
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('recruiter')}
              disabled={isSubmitting || isDemoLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-800 dark:bg-darkbg-300 dark:text-brand-300 dark:hover:bg-darkbg-200"
            >
              <BriefcaseBusiness className="h-4 w-4" />
              Try Recruiter Demo
            </button>
          </div>

          {isDemoLoading && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-brand-600 dark:text-brand-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Starting demo...
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
