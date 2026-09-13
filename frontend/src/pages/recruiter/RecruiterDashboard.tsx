import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../services/api';
import type { Job, JobApplication, Interview } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Plus, CalendarDays, Briefcase, 
  Settings, Users, ShieldCheck 
} from 'lucide-react';

export const RecruiterDashboard: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isPostJobOpen, setIsPostJobOpen] = useState(false);
  const [isApplicantsOpen, setIsApplicantsOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Selected details
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  // Forms state
  const [jobForm, setJobForm] = useState({ title: '', description: '', requirements: '', location: '', job_type: 'full_time', experience_level: 'mid', salary_min: '', salary_max: '' });
  const [interviewForm, setInterviewForm] = useState({ title: '', description: '', start_time: '', end_time: '', meet_link: '' });

  const fetchRecruiterData = async () => {
    try {
      const jobsRes = await api.get('/jobs/listings/');
      setJobs(jobsRes.data.results || jobsRes.data);

      const appsRes = await api.get('/jobs/applications/');
      setApplications(appsRes.data.results || appsRes.data);

      const interviewsRes = await api.get('/interviews/schedules/');
      setInterviews(interviewsRes.data.results || interviewsRes.data);
    } catch (err) {
      console.error("Failed to load recruiter metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiterData();
  }, []);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.profile.company) {
      return alert("Your profile must be linked to a Company first. Register a company in the sidebar.");
    }
    
    try {
      const payload = {
        ...jobForm,
        company: user.profile.company.id
      };
      await api.post('/jobs/listings/', payload);
      setIsPostJobOpen(false);
      setJobForm({ title: '', description: '', requirements: '', location: '', job_type: 'full_time', experience_level: 'mid', salary_min: '', salary_max: '' });
      fetchRecruiterData();
    } catch (err: any) {
      alert(err.company?.[0] || err.detail || "Error creating job posting.");
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      const payload = {
        ...interviewForm,
        application: selectedApp.id
      };
      await api.post('/interviews/schedules/', payload);
      setIsScheduleOpen(false);
      setInterviewForm({ title: '', description: '', start_time: '', end_time: '', meet_link: '' });
      fetchRecruiterData();
    } catch (err) {
      alert("Error scheduling interview");
    }
  };

  const handleUpdateStatus = async (appId: string, nextStatus: string) => {
    try {
      await api.patch(`/jobs/applications/${appId}/status/`, {
        status: nextStatus,
        comment: `Moved candidate to ${nextStatus} stage.`
      });
      fetchRecruiterData();
    } catch (err) {
      alert("Error updating candidate stage.");
    }
  };

  // Compile Chart Data: Number of applicants per job
  const getChartData = () => {
    return jobs.map(job => {
      const count = applications.filter(app => app.job.id === job.id).length;
      return {
        name: job.title.length > 15 ? `${job.title.substring(0, 12)}...` : job.title,
        Applicants: count
      };
    });
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

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Jobs Posted</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">{jobs.length}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
          </Card>

          <Card className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Applicants</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">{applications.length}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </Card>

          <Card className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Scheduled Interviews</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">{interviews.length}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400 flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
          </Card>

          <Card className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Company</span>
              <span className="text-sm font-black text-slate-800 dark:text-white mt-2 block flex items-center gap-1.5">
                {user?.profile.company ? (
                  <><ShieldCheck className="w-4 h-4 text-green-500" /> {user.profile.company.name}</>
                ) : (
                  'No Company Linked'
                )}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 dark:bg-darkbg-100 dark:text-slate-400 flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
          </Card>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Job Postings */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-brand-500" />
                  Your Active Job Postings
                </h2>
                <Button 
                  size="sm" 
                  onClick={() => setIsPostJobOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create Posting
                </Button>
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  No jobs posted yet. Click 'Create Posting' to start hiring.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {jobs.map((job) => {
                    const applicantsCount = applications.filter(app => app.job.id === job.id).length;
                    return (
                      <div key={job.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200">{job.title}</h4>
                          <span className="text-xs text-slate-400">{job.location} • {job.job_type}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{applicantsCount} Applicants</span>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => {
                              setSelectedJob(job);
                              setIsApplicantsOpen(true);
                            }}
                          >
                            Review Candidates
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Applicant Chart */}
            {jobs.length > 0 && (
              <Card>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-6">Applicants Volume Breakdown</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip cursor={{ fill: 'rgba(59, 102, 255, 0.05)' }} />
                      <Bar dataKey="Applicants" fill="#3b66ff" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Scheduled Interviews */}
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                <CalendarDays className="w-5 h-5 text-brand-500" />
                Scheduled Interviews
              </h2>

              {interviews.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  No interviews scheduled. Schedule a candidate in Review Candidates.
                </div>
              ) : (
                <div className="space-y-4">
                  {interviews.map((interview) => (
                    <div key={interview.id} className="p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-darkbg-100/30">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{interview.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Candidate: {interview.application_details.candidate.email}</p>
                      
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <span>{new Date(interview.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {interview.meet_link && (
                          <a href={interview.meet_link} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline font-bold">
                            Join Link
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>

      {/* Post a Job Modal */}
      <Modal isOpen={isPostJobOpen} onClose={() => setIsPostJobOpen(false)} title="Create New Job Posting">
        <form onSubmit={handlePostJob} className="space-y-4">
          <Input label="Job Title" required value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} />
          <Input label="Location" placeholder="e.g. Remote or San Francisco, CA" required value={jobForm.location} onChange={e => setJobForm({...jobForm, location: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Job Type</label>
              <select value={jobForm.job_type} onChange={e => setJobForm({...jobForm, job_type: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white">
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Experience Level</label>
              <select value={jobForm.experience_level} onChange={e => setJobForm({...jobForm, experience_level: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white">
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="lead">Lead / Management</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" label="Minimum Salary" value={jobForm.salary_min} onChange={e => setJobForm({...jobForm, salary_min: e.target.value})} />
            <Input type="number" label="Maximum Salary" value={jobForm.salary_max} onChange={e => setJobForm({...jobForm, salary_max: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Job Description</label>
            <textarea required value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-sm" rows={4}></textarea>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Requirements / Required Skills</label>
            <textarea required placeholder="List key requirements (e.g. Python, Django, React, AWS)" value={jobForm.requirements} onChange={e => setJobForm({...jobForm, requirements: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-sm" rows={3}></textarea>
          </div>
          <Button type="submit" className="w-full">Post Job</Button>
        </form>
      </Modal>

      {/* Review Applicants Modal */}
      <Modal isOpen={isApplicantsOpen} onClose={() => setIsApplicantsOpen(false)} title={`Applicants: ${selectedJob?.title}`} size="lg">
        {applications.filter(app => app.job.id === selectedJob?.id).length === 0 ? (
          <p className="text-center py-6 text-slate-400 dark:text-slate-500">No applications received for this job yet.</p>
        ) : (
          <div className="space-y-4">
            {applications.filter(app => app.job.id === selectedJob?.id).map((app) => (
              <div key={app.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-darkbg-100/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {app.candidate.email || 'Candidate Email'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                  {app.cover_letter && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                      "{app.cover_letter}"
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                  {app.ats_score !== null && app.ats_score !== undefined && (
                    <Badge variant={app.ats_score >= 70 ? 'success' : 'warning'}>
                      ATS: {app.ats_score}%
                    </Badge>
                  )}

                  <div className="flex items-center gap-1.5">
                    {app.status === 'applied' || app.status === 'screening' ? (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(app.id, 'screening')}
                          className="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                        >
                          Screen
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedApp(app);
                            setIsScheduleOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        >
                          Schedule
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(app.id, 'rejected')}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <Badge variant={app.status === 'offered' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>
                        {app.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} title="Schedule Interview Meeting">
        <form onSubmit={handleScheduleInterview} className="space-y-4">
          <Input label="Meeting Title" placeholder="e.g. Technical System Design Interview" required value={interviewForm.title} onChange={e => setInterviewForm({...interviewForm, title: e.target.value})} />
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Meeting Description</label>
            <textarea value={interviewForm.description} onChange={e => setInterviewForm({...interviewForm, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-sm" rows={3}></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input type="datetime-local" label="Start Date/Time" required value={interviewForm.start_time} onChange={e => setInterviewForm({...interviewForm, start_time: e.target.value})} />
            <Input type="datetime-local" label="End Date/Time" required value={interviewForm.end_time} onChange={e => setInterviewForm({...interviewForm, end_time: e.target.value})} />
          </div>
          <Input type="url" label="Video Meeting Link" placeholder="e.g. https://meet.google.com/xxx-xxxx-xxx" value={interviewForm.meet_link} onChange={e => setInterviewForm({...interviewForm, meet_link: e.target.value})} />
          <Button type="submit" className="w-full">Confirm Schedule</Button>
        </form>
      </Modal>

    </DashboardLayout>
  );
};
export default RecruiterDashboard;
