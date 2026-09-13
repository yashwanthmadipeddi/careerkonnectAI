import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';
import { 
  ArrowRight, ShieldCheck, BarChart3,
  BrainCircuit, Search, CalendarDays, Compass, Sun, Moon 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-darkbg-200 transition-colors duration-200">
      {/* Decorative Spheres */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-400/10 dark:bg-brand-900/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-violet-400/10 dark:bg-violet-900/5 blur-[150px] pointer-events-none"></div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-800/40 bg-white/70 dark:bg-darkbg-200/70 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              K
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-600 to-violet-600 dark:from-brand-400 dark:to-violet-400 bg-clip-text text-transparent">
              CareerKonnect
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Selector */}
            <button 
              onClick={toggleTheme} 
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-darkbg-300 text-slate-500 dark:text-slate-400 transition-all"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {user ? (
              <Link 
                to={`/dashboard/${user.role}`}
                className="px-5 py-2.5 rounded-xl font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm flex items-center gap-1.5 active:scale-95 transition-all text-sm"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  to="/login" 
                  className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition-colors text-sm"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-brand-600 to-brand-500 hover:shadow-md text-white flex items-center gap-1.5 active:scale-95 transition-all text-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32 relative z-10">
        <motion.div 
          className="text-center max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Heading */}
          <motion.h1 
            variants={itemVariants} 
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-800 dark:text-white leading-[1.15] mb-6"
          >
            Connect Talent and Opportunity with{' '}
            <span className="bg-gradient-to-r from-brand-500 to-violet-500 dark:from-brand-400 dark:to-violet-400 bg-clip-text text-transparent">
              AI
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p 
            variants={itemVariants} 
            className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8"
          >
            Here candidates can <strong className="font-bold text-brand-600 dark:text-brand-400">analyze their resumes</strong>, <strong className="font-bold text-brand-600 dark:text-brand-400">analyze the skill gaps</strong>, and apply to highly targeted <strong className="font-bold text-brand-600 dark:text-brand-400">ATS matching jobs</strong>. Simultaneously, recruiters and company representatives can manage job listings and find <strong className="font-bold text-brand-600 dark:text-brand-400">qualified candidates</strong> and job holders.
          </motion.p>

          {/* Call to Actions */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-lg hover:shadow-brand-500/20 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-darkbg-300/50 hover:bg-slate-50 dark:hover:bg-darkbg-300 transition-all text-slate-700 dark:text-slate-300 flex items-center justify-center"
            >
              Learn More
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200/50 dark:border-slate-800/40 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Robust AI Features for Modern Teams</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Empowering recruitment workflows through Advanced AI intelligence</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl glass-panel hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-5 shadow-sm">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">AI Resume Analyzer</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
              Evaluate ATS compatibility scores, pinpoint bullet-point weaknesses, and receive recommendations to tailor your resume for a job listing.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl glass-panel hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-5 shadow-sm">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">AI Skill Gap & Roadmaps</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
              Compare your profile against requirements, identify missing keywords, and map out a chronological monthly roadmap to gain necessary skills.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl glass-panel hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center text-green-600 dark:text-green-400 mb-5 shadow-sm">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">AI Job Recommendation</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
              Find the perfect match instantly. Our recommendation engine ranks open roles based on your uploaded resume and skill tags.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl glass-panel hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5 shadow-sm">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Interview prep generator</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
              Generate 5 job-specific interview questions, detailed evaluation answers, and study templates tailored to the role.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl glass-panel hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-5 shadow-sm">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Recruiter & Company Sections</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
              Dedicated pipelines for recruiters and company representatives to manage applicants, track candidate stages, schedule interviews, and evaluate top job holders.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-2xl glass-panel hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Enterprise Security</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
              Equipped with role-based routing gates, secure JWT auth, activity audit logs, and file verification for company representation.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200/50 dark:border-slate-800/40 text-center text-slate-400 dark:text-slate-500 text-sm relative z-10">
        <p>© 2026 CareerKonnect. Built with Django, React, Vite, TypeScript, and Google Gemini API.</p>
      </footer>
    </div>
  );
};
