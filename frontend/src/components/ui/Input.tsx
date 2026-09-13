import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl border ${
          error 
            ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500' 
            : 'border-slate-200 dark:border-slate-800 focus:ring-brand-500/20 focus:border-brand-500'
        } bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 transition-all dark:text-white placeholder-slate-400 ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 mt-1 block font-medium">{error}</span>
      )}
      {!error && helperText && (
        <span className="text-xs text-slate-400 mt-1 block">{helperText}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
