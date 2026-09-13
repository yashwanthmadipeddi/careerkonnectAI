import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { KeyRound, ArrowRight, Sun, Moon } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await forgotPassword(data.email);
      // Success. Redirect to reset password page and pass email
      navigate('/reset-password', { state: { email: data.email } });
    } catch (err: any) {
      setErrorMessage(err.email?.[0] || err.detail || 'Failed to request reset. Please try again.');
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
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-950/30 items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Forgot Password</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter your email and we will send you a 6-digit code to reset your password.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input 
              type="email" 
              placeholder="name@company.com" 
              {...register('email', { 
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
              })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white"
            />
            {errors.email && (
              <span className="text-xs text-red-500 mt-1 block">{errors.email.message as string}</span>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl font-bold bg-brand-500 text-white shadow-md hover:bg-brand-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Send Reset Code
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Remembered your password?{' '}
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
