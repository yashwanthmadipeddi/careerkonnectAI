import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Compass, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-darkbg-200 px-6">
      <div className="w-full max-w-md p-8 text-center rounded-2xl glass-panel shadow-lg">
        <div className="inline-flex w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-950/20 items-center justify-center text-brand-600 dark:text-brand-400 mb-6">
          <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">404</h1>
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Page Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <Link 
          to={user ? `/dashboard/${user.role}` : '/'}
          className="inline-flex py-3.5 px-6 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm items-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <Home className="w-4 h-4" />
          Back to CareerKonnect
        </Link>
      </div>
    </div>
  );
};
