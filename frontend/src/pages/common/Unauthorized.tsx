import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-darkbg-200 px-6">
      <div className="w-full max-w-md p-8 text-center rounded-2xl glass-panel shadow-lg">
        <div className="inline-flex w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/20 items-center justify-center text-red-600 dark:text-red-400 mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
          You do not have the required permissions to view this resource. 
          Please log in with an authorized account or contact an administrator.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-darkbg-300 hover:bg-slate-50 dark:hover:bg-darkbg-300 text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <Link 
            to={user ? `/dashboard/${user.role}` : '/'}
            className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
