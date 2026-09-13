import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Sun, Moon, LogOut, Menu, X, Bell, User,
  Briefcase, Award, Building2, ShieldAlert,
  Compass, FileText, Search, CalendarDays, Settings, History
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getAvatarUrl = (avatarPath?: string) => {
    if (!avatarPath) return undefined;
    if (avatarPath.startsWith('http')) return avatarPath;
    return `http://localhost:8000${avatarPath}`;
  };

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Define navigation links based on user role
  const getNavLinks = () => {
    switch (user.role) {
      case 'candidate':
        return [
          { name: 'Dashboard', path: '/dashboard/candidate', icon: <Compass className="w-5 h-5" /> },
          { name: 'Explore Jobs', path: '/jobs', icon: <Search className="w-5 h-5" /> },
          { name: 'My Applications', path: '/applications', icon: <Briefcase className="w-5 h-5" /> },
          { name: 'Saved Bookmarks', path: '/bookmarks', icon: <Award className="w-5 h-5" /> },
          { name: 'AI Career Prep', path: '/ai-prep', icon: <FileText className="w-5 h-5" /> },
        ];
      case 'recruiter':
        return [
          { name: 'Dashboard', path: '/dashboard/recruiter', icon: <Compass className="w-5 h-5" /> },
          { name: 'Post a Job', path: '/jobs/post', icon: <Briefcase className="w-5 h-5" /> },
          { name: 'Manage Jobs', path: '/jobs/manage', icon: <Settings className="w-5 h-5" /> },
          { name: 'Schedule Interviews', path: '/interviews/schedule', icon: <CalendarDays className="w-5 h-5" /> },
        ];
      case 'company':
        return [
          { name: 'Dashboard', path: '/dashboard/company', icon: <Compass className="w-5 h-5" /> },
          { name: 'Manage Jobs', path: '/jobs/manage', icon: <Briefcase className="w-5 h-5" /> },
          { name: 'Company Profile', path: '/company/profile', icon: <Building2 className="w-5 h-5" /> },
        ];
      case 'admin':
        return [
          { name: 'Dashboard', path: '/dashboard/admin', icon: <Compass className="w-5 h-5" /> },
          { name: 'Verifications', path: '/admin/verifications', icon: <ShieldAlert className="w-5 h-5" /> },
          { name: 'Audit Logs', path: '/admin/logs', icon: <History className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  const getRoleBadgeColor = () => {
    switch (user.role) {
      case 'admin': return 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400';
      case 'recruiter': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400';
      case 'company': return 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400';
      default: return 'bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkbg-200 transition-colors duration-200 flex">
      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200/50 bg-white dark:border-slate-800/40 dark:bg-darkbg-300 lg:static transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-0 lg:translate-x-0'
        } transition-transform duration-300 ease-in-out flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-slate-200/50 dark:border-slate-800/40 px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-bold text-base shadow-sm">
              K
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-brand-600 to-violet-600 dark:from-brand-400 dark:to-violet-400 bg-clip-text text-transparent">
              CareerKonnect
            </span>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                  isActive 
                    ? 'bg-brand-500 text-white shadow-sm hover:bg-brand-600' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-darkbg-100/50'
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Details */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/40 flex items-center gap-3 bg-slate-50/50 dark:bg-darkbg-200/20">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-darkbg-100 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold overflow-hidden border border-slate-200 dark:border-slate-800">
            {user.profile.avatar ? (
              <img src={getAvatarUrl(user.profile.avatar)} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              user.profile.first_name[0]
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {user.profile.first_name} {user.profile.last_name}
            </p>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${getRoleBadgeColor()}`}>
              {user.role}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Main Header / Navbar */}
        <header className="h-16 border-b border-slate-200/50 bg-white dark:border-slate-800/40 dark:bg-darkbg-300 px-6 flex items-center justify-between flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-darkbg-100 text-slate-500 dark:text-slate-400"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 hidden sm:block">
              {navLinks.find(link => location.pathname === link.path)?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Dark/Light mode switch */}
            <button 
              onClick={toggleTheme} 
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-darkbg-100 text-slate-500 dark:text-slate-400"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Notification bell */}
            <button className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-darkbg-100 text-slate-500 dark:text-slate-400 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-1 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-darkbg-100 text-slate-500 dark:text-slate-400"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-darkbg-100 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 overflow-hidden">
                  {user.profile.avatar ? (
                    <img src={getAvatarUrl(user.profile.avatar)} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.profile.first_name[0]
                  )}
                </div>
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-48 rounded-xl border border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-darkbg-300 py-1.5 shadow-xl">
                  <Link 
                    to="/profile" 
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-darkbg-100/50 text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <User className="w-4 h-4" />
                    Account Profile
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm font-semibold text-red-600 dark:text-red-400 text-left border-t border-slate-100 dark:border-slate-800"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-grow overflow-y-auto p-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
