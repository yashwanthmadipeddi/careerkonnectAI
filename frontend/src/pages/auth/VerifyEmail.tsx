import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ShieldCheck, Sun, Moon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const VerifyEmail: React.FC = () => {
  const { verifyEmail, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    // Get email from router navigation state (e.g. passed from register page)
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      // If none, direct user to go back to login
      setErrorMessage("No email provided. Please sign in or register first.");
    }
  }, [location]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      await verifyEmail(email, data.otp);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.otp?.[0] || err.detail || 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) return;
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      await api.post('/auth/resend-otp/', { email });
      setInfoMessage("Verification code resent successfully. Please check your inbox.");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to resend code.');
    }
  };

  const handleBackToLogin = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-darkbg-200">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand-300/20 dark:bg-brand-900/10 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-300/20 dark:bg-violet-900/10 blur-[120px]"></div>

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 right-6 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-darkbg-100/50 backdrop-blur-md shadow-sm hover:scale-105 transition-all text-slate-600 dark:text-slate-300"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md p-8 rounded-2xl glass-panel relative z-10 transition-all duration-300 hover:shadow-glass-light dark:hover:shadow-glass-dark">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-950/30 items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Verify Your Email</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            We have sent a 6-digit code to <span className="font-semibold text-slate-700 dark:text-slate-300">{email || 'your email'}</span>
          </p>
        </div>

        <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400 text-xs font-semibold leading-relaxed text-center">
          🎉 Account Created Successfully! We've sent a 6-digit OTP verification code to your email.
        </div>

        <div className="mb-6 p-3.5 rounded-xl border border-brand-200 bg-brand-50/50 dark:border-brand-900/30 dark:bg-brand-950/10 text-brand-750 dark:text-brand-300 text-xs leading-relaxed font-semibold text-center">
          💡 <strong>Testing Note:</strong> Since emails are simulated locally, look at your python command console logs in the background for the 6-digit code!
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400 text-sm font-medium">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* OTP Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
              Verification Code (6 Digits)
            </label>
            <input 
              type="text" 
              placeholder="000000" 
              maxLength={6}
              {...register('otp', { 
                required: 'Verification code is required',
                pattern: { value: /^[0-9]{6}$/, message: 'Must be exactly 6 digits' }
              })}
              className="w-full text-center tracking-[0.5em] text-2xl font-bold px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white"
            />
            {errors.otp && (
              <span className="text-xs text-red-500 mt-1 block text-center">{errors.otp.message as string}</span>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting || !email}
            className="w-full py-3.5 px-4 rounded-xl font-bold bg-brand-500 text-white shadow-md hover:bg-brand-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Verify Email
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col gap-3">
          <p>
            Didn't receive the code?{' '}
            <button 
              type="button"
              onClick={handleResendOTP}
              disabled={!email}
              className="font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors disabled:opacity-50"
            >
              Resend Code
            </button>
          </p>
          <div className="mt-2">
            <button 
              type="button"
              onClick={handleBackToLogin}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isSuccessModalOpen} 
        onClose={() => {}} 
        title="Email Verified Successfully!"
      >
        <div className="text-center py-5 space-y-4">
          <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/20 items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle2 className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Verification Complete</h3>
          <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            Your account has been successfully verified. Let's proceed to set up your profile preferences and analyze your resume.
          </p>
          <Button 
            className="w-full mt-4" 
            onClick={() => {
              setIsSuccessModalOpen(false);
              navigate('/profile-setup');
            }}
          >
            Proceed to Profile Setup
          </Button>
        </div>
      </Modal>
    </div>
  );
};
