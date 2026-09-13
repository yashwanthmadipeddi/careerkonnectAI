import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'brand' | 'white' | 'slate';
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  color = 'brand' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    brand: 'border-brand-200 border-t-brand-500',
    white: 'border-white/20 border-t-white',
    slate: 'border-slate-200 border-t-slate-500 dark:border-slate-800 dark:border-t-slate-400',
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin`}
      role="status"
    />
  );
};
