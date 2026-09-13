import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../services/api';
import type { Candidate, JobApplication } from '../../types';
import { 
  FileText, Plus, Trash2, GraduationCap, 
  Briefcase, Target, Sparkles, ChevronRight
} from 'lucide-react';

export const CandidateDashboard: React.FC = () => {
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);

  // Form states
  const [expForm, setExpForm] = useState({ company_name: '', role: '', start_date: '', end_date: '', is_current: false, description: '' });
  const [eduForm, setEduForm] = useState({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '' });

  // Fetch candidate profile data
  const fetchCandidateData = async () => {
    try {
      const profileRes = await api.get('/candidates/profile/');
      setCandidate(profileRes.data);
      
      const appRes = await api.get('/jobs/applications/');
      setApplications(appRes.data.results || appRes.data);

      const recRes = await api.get('/ai/job-recommendations/');
      setRecommendations(recRes.data.recommendations || []);
    } catch (err) {
      console.error("Failed to load candidate dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidateData();
  }, []);

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/candidates/experiences/', expForm);
      setIsExpModalOpen(false);
      setExpForm({ company_name: '', role: '', start_date: '', end_date: '', is_current: false, description: '' });
      fetchCandidateData();
    } catch (err) {
      alert("Error adding experience");
    }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/candidates/experiences/${id}/`);
      fetchCandidateData();
    } catch (err) {
      alert("Error deleting experience");
    }
  };

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/candidates/educations/', eduForm);
      setIsEduModalOpen(false);
      setEduForm({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '' });
      fetchCandidateData();
    } catch (err) {
      alert("Error adding education");
    }
  };

  const handleDeleteEducation = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/candidates/educations/${id}/`);
      fetchCandidateData();
    } catch (err) {
      alert("Error deleting education");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <Card variant="glass" className="relative overflow-hidden bg-gradient-to-r from-brand-600/10 to-violet-600/10 dark:from-brand-950/20 dark:to-violet-950/20 border-brand-500/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 overflow-hidden">
                {user?.profile.avatar ? (
                  <img src={user.profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.profile.first_name[0]
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white">
                  Welcome back, {user?.profile.first_name}!
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {candidate?.headline || 'No headline set. Complete your profile below.'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Link to="/resume-builder" className="inline-flex"><Button variant="outline" size="sm" leftIcon={<FileText className="w-4 h-4" />}>Resume Builder</Button></Link>
              <Link to="/ai-prep" className="inline-flex">
                <Button size="sm" variant="primary" leftIcon={<Sparkles className="w-4 h-4" />}>
                  Run Gemini AI Analyzer
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800/40">
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Job Applications</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">{applications.length}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Years of Experience</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">{candidate?.experience_years || '0'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Skills Listed</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">{candidate?.skills.length || '0'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">AI Match Suggestions</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">{recommendations.length}</span>
            </div>
          </div>
        </Card>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Applications & Recommendations */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Applied Jobs */}
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-brand-500" />
                  Your Active Applications
                </h2>
              </div>
              
              {applications.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  No applications yet. Search open listings to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-100/30 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{app.job.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{app.job.company.name} • Applied on {new Date(app.created_at).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {app.ats_score !== null && (
                          <Badge variant="brand">ATS: {app.ats_score}%</Badge>
                        )}
                        <Badge variant={app.status === 'offered' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>
                          {app.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* AI Recommendations */}
            <Card>
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">AI-Matched Job Recommendations</h2>
              </div>
              
              {recommendations.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  Add more skills and experience details to receive personalized recommendations.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.slice(0, 4).map((rec) => (
                    <div key={rec.job_id} className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-darkbg-100/50 flex flex-col justify-between hover:shadow-sm transition-all">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{rec.title}</h4>
                          <span className="text-xs font-black text-violet-600 dark:text-violet-400">{rec.match_score}% Match</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{rec.company_name} • {rec.location}</p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{rec.job_type}</span>
                        <Link to={`/jobs/${rec.job_id}`} className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-0.5">
                          View details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Profile details Builder */}
          <div className="space-y-8">
            {/* Work Experiences */}
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-brand-500" />
                  Experience
                </h3>
                <button 
                  onClick={() => setIsExpModalOpen(true)}
                  className="p-1 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {candidate?.experiences.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No experience added. Click '+' to build.</p>
              ) : (
                <div className="space-y-6">
                  {candidate?.experiences.map((exp) => (
                    <div key={exp.id} className="relative pl-4 border-l border-slate-200 dark:border-slate-800 group">
                      <div className="absolute top-1 left-[-4.5px] w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-brand-500 transition-colors"></div>
                      
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{exp.role}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{exp.company_name}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(exp.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })} - {exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : ''}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Educations */}
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-brand-500" />
                  Education
                </h3>
                <button 
                  onClick={() => setIsEduModalOpen(true)}
                  className="p-1 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {candidate?.educations.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No education added. Click '+' to build.</p>
              ) : (
                <div className="space-y-6">
                  {candidate?.educations.map((edu) => (
                    <div key={edu.id} className="relative pl-4 border-l border-slate-200 dark:border-slate-800 group">
                      <div className="absolute top-1 left-[-4.5px] w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-brand-500 transition-colors"></div>
                      
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{edu.degree}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{edu.institution}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Graduation: {edu.end_date ? new Date(edu.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Present'}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteEducation(edu.id)}
                          className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>

      {/* Experience Modal */}
      <Modal isOpen={isExpModalOpen} onClose={() => setIsExpModalOpen(false)} title="Add Work Experience">
        <form onSubmit={handleAddExperience} className="space-y-4">
          <Input label="Company Name" required value={expForm.company_name} onChange={e => setExpForm({...expForm, company_name: e.target.value})} />
          <Input label="Role" required value={expForm.role} onChange={e => setExpForm({...expForm, role: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label="Start Date" required value={expForm.start_date} onChange={e => setExpForm({...expForm, start_date: e.target.value})} />
            <Input type="date" label="End Date" disabled={expForm.is_current} value={expForm.end_date} onChange={e => setExpForm({...expForm, end_date: e.target.value})} />
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="is_current" checked={expForm.is_current} onChange={e => setExpForm({...expForm, is_current: e.target.checked})} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
            <label htmlFor="is_current" className="ml-2 text-sm text-slate-600 dark:text-slate-400">Current Role</label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Description</label>
            <textarea value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white" rows={4}></textarea>
          </div>
          <Button type="submit" className="w-full">Save Experience</Button>
        </form>
      </Modal>

      {/* Education Modal */}
      <Modal isOpen={isEduModalOpen} onClose={() => setIsEduModalOpen(false)} title="Add Education">
        <form onSubmit={handleAddEducation} className="space-y-4">
          <Input label="Institution" required value={eduForm.institution} onChange={e => setEduForm({...eduForm, institution: e.target.value})} />
          <Input label="Degree / Diploma" required value={eduForm.degree} onChange={e => setEduForm({...eduForm, degree: e.target.value})} />
          <Input label="Field of Study" value={eduForm.field_of_study} onChange={e => setEduForm({...eduForm, field_of_study: e.target.value})} />
          <div className="grid grid-cols-3 gap-4">
            <Input type="date" label="Start Date" required value={eduForm.start_date} onChange={e => setEduForm({...eduForm, start_date: e.target.value})} />
            <Input type="date" label="End Date" value={eduForm.end_date} onChange={e => setEduForm({...eduForm, end_date: e.target.value})} />
            <Input type="number" step="0.01" label="GPA" value={eduForm.gpa} onChange={e => setEduForm({...eduForm, gpa: e.target.value})} />
          </div>
          <Button type="submit" className="w-full">Save Education</Button>
        </form>
      </Modal>

    </DashboardLayout>
  );
};
export default CandidateDashboard;
