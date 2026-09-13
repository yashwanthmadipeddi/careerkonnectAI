import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ShieldAlert, Eye, EyeOff, Sun, Moon, CheckCircle2 } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const passwordVal = watch('password');

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      setErrorMessage("No email provided. Please request a new code first.");
    }
  }, [location]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = {
        email,
        otp: data.otp,
        password: data.password,
        password_confirm: data.password_confirm,
      };
      await resetPassword(payload);
      setSuccessMessage("Your password has been successfully reset! Redirecting to login...");
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.otp?.[0] || err.password?.[0] || err.detail || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
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
        {successMessage ? (
          <div className="text-center py-6">
            <div className="inline-flex w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 items-center justify-center text-green-600 dark:text-green-400 mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Password Reset Complete</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{successMessage}</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-950/30 items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Set New Password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter the code sent to <span className="font-semibold text-slate-700 dark:text-slate-300">{email || 'your email'}</span> and choose a new password.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-sm font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* OTP Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  6-Digit Reset Code
                </label>
                <input 
                  type="text" 
                  placeholder="000000" 
                  maxLength={6}
                  {...register('otp', { 
                    required: 'Reset code is required',
                    pattern: { value: /^[0-9]{6}$/, message: 'Must be exactly 6 digits' }
                  })}
                  className="w-full text-center tracking-[0.5em] text-lg font-bold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white"
                />
                {errors.otp && (
                  <span className="text-xs text-red-500 mt-1 block text-center">{errors.otp.message as string}</span>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Min 8 characters" 
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' }
                    })}
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white"
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
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  {...register('password_confirm', { 
                    required: 'Confirm password is required',
                    validate: value => value === passwordVal || 'Passwords do not match'
                  })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white"
                />
                {errors.password_confirm && <span className="text-xs text-red-500 mt-1 block">{errors.password_confirm.message as string}</span>}
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
                  "Reset Password"
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link 
                to="/login" 
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
