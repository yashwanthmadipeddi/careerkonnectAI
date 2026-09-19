import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { getBrowserAvatar, saveBrowserAvatar, removeBrowserAvatar, isBrowserAvatarRemoved } from '../../services/browserAvatar';
import { Building2, UserCheck, Image as ImageIcon, CheckCircle2, Sparkles } from 'lucide-react';

interface AIAnalysisResult {
  ats_score: number;
  resume_score: number;
  improvement_suggestions: string[];
  match_analysis: string;
}

export const ProfileSetup: React.FC = () => {
  const { user, logout, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile Step Control
  const [step, setStep] = useState<'form' | 'loading' | 'ai_results'>('form');

  // Profile Photo Setup
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);


  // AI Analysis results
  const [aiAnalysis] = useState<AIAnalysisResult | null>(null);

  // Candidate Setup Form
  const [candidateForm, setCandidateForm] = useState({
    target_job_title: '',
    headline: '',
    skills: '',
    experience_years: 0
  });

  // Company / Recruiter Setup Form
  const [companyForm, setCompanyForm] = useState({
    name: '',
    website: '',
    industry: '',
    size: '1-10',
    location: '',
    description: ''
  });

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      navigate('/login');
      return;
    }

    const loadAvatar = async () => {
      try {
        const userId = String(user.id);
        const browserAvatar = await getBrowserAvatar(userId);

        if (cancelled) return;

        if (browserAvatar) {
          setAvatarPreview(browserAvatar);
          return;
        }

        const existingAvatar = (user as any)?.profile?.avatar;
        if (!isBrowserAvatarRemoved(userId) && existingAvatar && !avatarPreview) {
          setAvatarPreview(existingAvatar);
        }
      } catch (error) {
        console.error('Unable to load browser avatar:', error);
      }
    };

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [user, navigate, avatarPreview]);

  const persistAvatarLocally = async (file: File) => {
    if (!user) return;

    try {
      await saveBrowserAvatar(String(user.id), file);

      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }

      setAvatarFile(file);
      setAvatarRemoved(false);
      setAvatarPreview(URL.createObjectURL(file));
      setErrorMessage(null);
    } catch (error) {
      console.error('Browser avatar storage failed:', error);
      setErrorMessage('Unable to save the selected profile photo in this browser.');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file.');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1400;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setErrorMessage('Unable to prepare the selected image. Please choose another photo.');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            setErrorMessage('Unable to prepare the selected image. Please choose another photo.');
            return;
          }
          persistAvatarLocally(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.82);
      };
      img.onerror = () => setErrorMessage('The selected image could not be read. Please choose another photo.');
      img.src = URL.createObjectURL(file);
      return;
    }

    persistAvatarLocally(file);
  };


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout failed:", err);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
  };

  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!candidateForm.target_job_title.trim()) {
      return setErrorMessage('Please enter your target job role.');
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const targetJobTitle = candidateForm.target_job_title.trim();
      const skillsArray = candidateForm.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      // The profile photo is browser-local. Only candidate text fields are sent to Django.
      await api.put('/candidates/profile/', {
        target_job_title: targetJobTitle,
        headline: targetJobTitle,
        skills: skillsArray,
        experience_years: Number(candidateForm.experience_years) || 0
      });

      await refreshSession();
      navigate('/resume-builder');
    } catch (err: any) {
      setStep('form');
      const apiData = err.response?.data;
      const fieldErrors = apiData?.fields;
      let fieldText = '';

      if (fieldErrors) {
        fieldText = ` ${Object.entries(fieldErrors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : String(messages)}`)
          .join(' ')}`;
      }

      setErrorMessage(
        `${apiData?.error || apiData?.detail || err.detail || 'Error saving candidate profile details.'}${fieldText}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name || !companyForm.website || !companyForm.industry) {
      return setErrorMessage("Please fill out all required fields.");
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Upload Avatar if selected
      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.append('avatar', avatarFile);
        await api.put('/users/me/profile/', avatarData);
      }

      // 2. Submit Company Details
      await api.post('/companies/profiles/', companyForm);
      
      // Force reload page to refresh company link in context
      window.location.href = user?.role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/company';
    } catch (err: any) {
      setErrorMessage(err.detail || "Error registering company details.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const popularRoles = [
    "Frontend Engineer",
    "Backend Engineer",
    "Fullstack Developer",
    "Mobile App Developer",
    "UI/UX Product Designer",
    "Product Manager",
    "Data Scientist",
    "QA Automation Engineer",
    "DevOps Engineer",
    "AI / Machine Learning Engineer",
    "Software Engineer",
    "Solution Architect",
    "Systems Administrator",
    "Cybersecurity Analyst",
    "Database Administrator",
    "Business Analyst",
    "Project Manager"
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-darkbg-200 py-12 px-6">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand-300/20 dark:bg-brand-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-300/20 dark:bg-violet-900/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-xl relative z-10">
        
        {/* Step 1: Onboarding Forms */}
        {step === 'form' && (
          <Card variant="glass" className="shadow-xl">
            <div className="text-center mb-6">
              <div className="inline-flex w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950/30 items-center justify-center text-brand-600 dark:text-brand-400 mb-3 shadow-inner">
                {user.role === 'candidate' ? <UserCheck className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Complete Your Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Complete a few details first. You can use the existing demo resume or create your own resume next.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Profile Photo (optional) */}
            <div className="mb-6 flex flex-col items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/40 pb-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-center">
                Profile Photo <span className="normal-case font-medium text-slate-400">(Optional)</span>
              </label>

              <div className="w-20 h-20 rounded-full border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 overflow-hidden flex items-center justify-center shadow-inner">
                {avatarPreview && !avatarRemoved ? (
                  <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-900/50 text-[11px] font-semibold text-brand-600 dark:text-brand-400 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors">
                  {avatarPreview && !avatarRemoved ? 'Change Photo' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>

                {avatarPreview && !avatarRemoved && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await removeBrowserAvatar(String(user.id));
                        if (avatarPreview?.startsWith('blob:')) {
                          URL.revokeObjectURL(avatarPreview);
                        }
                        setAvatarFile(null);
                        setAvatarRemoved(true);
                        setAvatarPreview(null);
                        setErrorMessage(null);
                      } catch (error) {
                        console.error('Unable to remove browser avatar:', error);
                        setErrorMessage('Unable to remove the profile photo from this browser.');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <span className="text-[10px] text-slate-400">Stored on this browser. You can change or remove it anytime.</span>
            </div>

            {user.role === 'candidate' ? (
              /* Candidate Onboarding Form */
              <form onSubmit={handleCandidateSubmit} className="space-y-4">
                {/* Job Role Datalist Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Target Job Role *
                  </label>
                  <input 
                    list="popular-job-roles" 
                    placeholder="Select a role or type your own" 
                    required
                    value={candidateForm.target_job_title}
                    onChange={e => setCandidateForm({
                      ...candidateForm,
                      target_job_title: e.target.value,
                      headline: e.target.value
                    })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white text-sm"
                  />
                  <datalist id="popular-job-roles">
                    {popularRoles.map(role => (
                      <option key={role} value={role} />
                    ))}
                  </datalist>
                  <span className="text-[10px] text-slate-400 block mt-1">Select from the list when typing, or enter a custom title.</span>
                </div>
                <Button type="submit" className="w-full mt-2" isLoading={loading}>
                  Continue to Resume Builder
                </Button>
              </form>
            ) : (
              /* Recruiter / Company Rep Onboarding Form */
              <form onSubmit={handleCompanySubmit} className="space-y-4">
                <Input 
                  label="Company Name *" 
                  placeholder="e.g. Google or TechCorp Solutions" 
                  required 
                  value={companyForm.name} 
                  onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} 
                />
                <Input 
                  type="url"
                  label="Company Website URL *" 
                  placeholder="https://company.com" 
                  required 
                  value={companyForm.website} 
                  onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} 
                />
                <Input 
                  label="Industry *" 
                  placeholder="e.g. Software, Tech, Healthcare" 
                  required 
                  value={companyForm.industry} 
                  onChange={e => setCompanyForm({ ...companyForm, industry: e.target.value })} 
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Company Size</label>
                    <select 
                      value={companyForm.size} 
                      onChange={e => setCompanyForm({ ...companyForm, size: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
                    >
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501+">501+ employees</option>
                    </select>
                  </div>
                  <Input 
                    label="Location" 
                    placeholder="e.g. San Francisco, CA" 
                    value={companyForm.location} 
                    onChange={e => setCompanyForm({ ...companyForm, location: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Company Description</label>
                  <textarea 
                    placeholder="Tell us about the company mission, products or engineering team..." 
                    rows={3}
                    value={companyForm.description}
                    onChange={e => setCompanyForm({ ...companyForm, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all dark:text-white text-sm"
                  />
                </div>
                <Button type="submit" className="w-full mt-2" isLoading={loading}>
                  Register Company Profile
                </Button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/40 text-center">
              <button 
                type="button"
                onClick={handleLogout}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-250 transition-colors underline"
              >
                Sign Out & Create Another Account
              </button>
            </div>
          </Card>
        )}

        {/* Step 2: AI Analyzing Loading Screen */}
        {step === 'loading' && (
          <Card variant="glass" className="text-center py-12 space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-brand-100 dark:border-brand-950/40"></div>
              <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-brand-500">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">AI Resume Analysis In Progress...</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Our AI model is parsing your CV text to calculate ATS compatibility against <strong>{candidateForm.target_job_title}</strong> guidelines.
              </p>
            </div>
          </Card>
        )}

        {/* Step 3: AI Analysis Results Display */}
        {step === 'ai_results' && aiAnalysis && (
          <Card variant="glass" className="space-y-6">
            <div className="text-center pb-4 border-b border-slate-200/50 dark:border-slate-800/40">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                AI Onboarding Review
              </h2>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">Real-time ATS parsing completed successfully</p>
            </div>

            {/* Score Indicators Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white/40 dark:bg-darkbg-300/20 text-center">
                <span className="text-2xl font-extrabold text-brand-650 dark:text-brand-400">{aiAnalysis.ats_score}%</span>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">ATS Match Score</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white/40 dark:bg-darkbg-300/20 text-center">
                <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">{aiAnalysis.resume_score}%</span>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">CV Quality Rating</span>
              </div>
            </div>

            {/* Match Analysis summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide">Analysis Summary</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-white/50 dark:bg-darkbg-300/10 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {aiAnalysis.match_analysis}
              </p>
            </div>

            {/* Suggestions list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide">AI Change Suggestions</h4>
              <div className="space-y-2">
                {aiAnalysis.improvement_suggestions.map((suggestion, index) => (
                  <div key={index} className="flex gap-2.5 items-start text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Proceed Action Button */}
            <Button 
              className="w-full mt-4" 
              onClick={() => { window.location.href = '/dashboard/candidate'; }}
            >
              Looks Great, Enter Dashboard
            </Button>
          </Card>
        )}

      </div>
    </div>
  );
};
export default ProfileSetup;
