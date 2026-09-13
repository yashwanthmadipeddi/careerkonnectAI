import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'slate';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  size = 'md'
}) => {
  const baseStyle = 'inline-flex items-center font-semibold rounded-full uppercase tracking-wider';
  
  const variants = {
    brand: 'bg-brand-50 border border-brand-200 text-brand-700 dark:bg-brand-950/20 dark:border-brand-900/30 dark:text-brand-400',
    success: 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400',
    warning: 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400',
    slate: 'bg-slate-100 border border-slate-200 text-slate-700 dark:bg-darkbg-300 dark:border-slate-800 dark:text-slate-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};
