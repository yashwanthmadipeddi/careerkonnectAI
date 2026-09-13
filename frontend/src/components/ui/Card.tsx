import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'borderless';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const baseStyle = 'rounded-2xl overflow-hidden p-6 transition-all duration-200';
  
  const variants = {
    default: 'border border-slate-200/50 bg-white dark:border-slate-800/40 dark:bg-darkbg-300 shadow-sm hover:shadow-md',
    glass: 'glass-panel shadow-sm hover:shadow-md',
    borderless: 'bg-white dark:bg-darkbg-300 shadow-sm',
  };

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
