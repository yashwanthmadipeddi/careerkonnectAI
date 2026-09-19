import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ShieldCheck, Sun, Moon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';

interface VerificationRouteState {
  email?: string;
  otp?: string;
}

const SIGNUP_EMAIL_KEY = 'careerkonnect_signup_email';
const SIGNUP_OTP_KEY = 'careerkonnect_signup_otp';

export const VerifyEmail: React.FC = () => {
  const { verifyEmail, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [verificationOtp, setVerificationOtp] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const clearSignupVerificationStorage = () => {
    sessionStorage.removeItem(SIGNUP_EMAIL_KEY);
    sessionStorage.removeItem(SIGNUP_OTP_KEY);
  };

  useEffect(() => {
    const state = (location.state || {}) as VerificationRouteState;
    const storedEmail = sessionStorage.getItem(SIGNUP_EMAIL_KEY) || '';
    const storedOtp = sessionStorage.getItem(SIGNUP_OTP_KEY) || '';

    const nextEmail = state.email || storedEmail;
    const nextOtp = state.otp || storedOtp;

    setEmail(nextEmail);
    setVerificationOtp(nextOtp);

    if (state.email) {
      sessionStorage.setItem(SIGNUP_EMAIL_KEY, state.email);
    }
    if (state.otp) {
      sessionStorage.setItem(SIGNUP_OTP_KEY, state.otp);
    }

    if (!nextEmail) {
      setErrorMessage('No email provided. Please register first.');
    } else {
      setErrorMessage(null);
    }
  }, [location.state]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await verifyEmail(email, data.otp);
      clearSignupVerificationStorage();
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
      const response = await api.post('/auth/resend-otp/', { email });
      const nextOtp = response.data?.verification_otp;

      if (nextOtp) {
        setVerificationOtp(nextOtp);
        sessionStorage.setItem(SIGNUP_OTP_KEY, nextOtp);
        setInfoMessage('A new verification code was generated below.');
      } else {
        setInfoMessage('Verification code resent successfully.');
      }

      reset();
    } catch (err: any) {
      const apiError = err.response?.data;
      setErrorMessage(
        apiError?.error ||
        apiError?.detail ||
        apiError?.email?.[0] ||
        'Failed to resend code.'
      );
    }
  };

  const handleBackToLogin = async () => {
    clearSignupVerificationStorage();
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
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
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Verify Your Email
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verification code for <span className="font-semibold text-slate-700 dark:text-slate-300">{email || 'your email'}</span>
          </p>
        </div>

        {verificationOtp && (
          <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50/70 dark:border-brand-900/40 dark:bg-brand-950/20 p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              Verification Code
            </p>
            <p className="mt-2 text-3xl font-black tracking-[0.35em] text-brand-700 dark:text-brand-200">
              {verificationOtp}
            </p>
          </div>
        )}

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
              inputMode="numeric"
              autoComplete="one-time-code"
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
              clearSignupVerificationStorage();
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
