import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../services/api';
import type { Job } from '../../types';
import { 
  Search, MapPin, Briefcase, CheckCircle2, X
} from 'lucide-react';

export const ExploreJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Geolocation States
  const [nearbyActive, setNearbyActive] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [detectedLoc, setDetectedLoc] = useState<string | null>(null);

  // Candidate profile state (to detect default resume)
  const [candidate, setCandidate] = useState<any>(null);

  // Apply Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Application Inputs
  const [addCoverLetter, setAddCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs/listings/');
      setJobs(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to load jobs list:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidate = async () => {
    try {
      const res = await api.get('/candidates/profile/');
      setCandidate(res.data);
    } catch (err) {
      console.error("Failed to load candidate profile details:", err);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`User coordinates: ${latitude}, ${longitude}`);
        setDetectedLoc("India/Nearby Region");
        setNearbyActive(true);
        setDetectingLoc(false);
      },
      (error) => {
        console.error("Location access error:", error);
        alert("Location access denied. Displaying nearby Indian jobs as fallback.");
        setDetectedLoc("India (Fallback)");
        setNearbyActive(true);
        setDetectingLoc(false);
      }
    );
  };

  useEffect(() => {
    fetchJobs();
    fetchCandidate();
  }, []);

  const handleOpenApply = (job: Job) => {
    setSelectedJob(job);
    setIsApplyModalOpen(true);
    setApplySuccess(false);
    setApplyError(null);
    setAddCoverLetter(false);
    setCoverLetter('');
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    if (!candidate?.generated_resume_text) {
      setApplyError('Please create your CareerKonnect resume before applying.');
      return;
    }
    setApplyError(null);
    setApplying(true);
    try {
      await api.post('/jobs/applications/', {
        job: selectedJob.id,
        ...(addCoverLetter && coverLetter ? { cover_letter: coverLetter } : {}),
      });
      setApplySuccess(true);
      fetchJobs();
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setApplySuccess(false);
        setApplyError(null);
      }, 2500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.non_field_errors?.[0] || 'Application failed. Please try again.';
      setApplyError(errorMsg);
    } finally {
      setApplying(false);
    }
  };

  const formatSalary = (min?: string, max?: string, currency: string = 'USD') => {
    if (!min && !max) return null;
    const symbol = currency === 'INR' ? '₹' : '$';
    const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      maximumFractionDigits: 0
    });
    
    const minVal = min ? formatter.format(Number(min)) : null;
    const maxVal = max ? formatter.format(Number(max)) : null;
    
    if (minVal && maxVal) {
      return `${symbol}${minVal} - ${symbol}${maxVal} ${currency}`;
    } else if (minVal) {
      return `From ${symbol}${minVal} ${currency}`;
    } else {
      return `Up to ${symbol}${maxVal} ${currency}`;
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType ? job.job_type === filterType : true;
    
    const matchesNearby = nearbyActive
      ? job.location.toLowerCase().includes('india') || 
        job.location.toLowerCase().includes('bangalore') || 
        job.location.toLowerCase().includes('hyderabad') || 
        job.location.toLowerCase().includes('mumbai') || 
        job.location.toLowerCase().includes('delhi')
      : true;

    return matchesSearch && matchesType && matchesNearby;
  });

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
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Search & Filters */}
        <Card className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search jobs by title or company..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingLoc}
              className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                nearbyActive 
                  ? 'bg-brand-500 border-brand-500 text-white shadow-md' 
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-darkbg-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              📍 {detectingLoc ? "Detecting..." : nearbyActive ? `Nearby Active (${detectedLoc || 'India'})` : "Detect Nearby Jobs"}
            </button>
            {nearbyActive && (
              <button 
                type="button"
                onClick={() => {
                  setNearbyActive(false);
                  setDetectedLoc(null);
                }}
                className="text-xs text-red-500 hover:text-red-600 font-bold transition-colors"
              >
                Clear
              </button>
            )}

            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="w-full sm:w-40 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-xs font-bold"
            >
              <option value="">All Job Types</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="remote">Remote</option>
            </select>
          </div>
        </Card>

        {/* Jobs List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.length === 0 ? (
            <div className="col-span-full text-center py-20 text-slate-400 dark:text-slate-500">
              <Briefcase className="w-16 h-16 mx-auto mb-3 opacity-30" />
              No open job postings match your filters.
            </div>
          ) : (
            filteredJobs.map((job) => (
              <Card key={job.id} className="flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{job.title}</h3>
                      <span className="text-xs text-brand-500 dark:text-brand-400 font-semibold block mt-0.5">{job.company.name}</span>
                    </div>
                    <Badge variant={job.job_type === 'remote' ? 'success' : 'brand'}>{job.job_type.replace('_', ' ')}</Badge>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.requirements.split(',').slice(0, 3).map((req, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-50 dark:bg-darkbg-100 text-slate-500 dark:text-slate-400 text-[10px] border border-slate-100 dark:border-slate-800">
                        {req.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </div>
                  <Button size="sm" onClick={() => handleOpenApply(job)}>
                    Apply Now
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Apply Modal */}
      <Modal 
        isOpen={isApplyModalOpen} 
        onClose={() => setIsApplyModalOpen(false)} 
        title={`Apply: ${selectedJob?.title}`}
        size="lg"
      >
        {applySuccess ? (
          <div className="text-center py-8">
            <div className="inline-flex w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/20 items-center justify-center text-green-600 dark:text-green-400 mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-850 dark:text-white">Application Submitted!</h3>
            <p className="text-xs text-slate-400 mt-1">We've calculated your ATS score and updated your applied timeline.</p>
          </div>
        ) : applyError ? (
          <div className="text-center py-8">
            <div className="inline-flex w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/20 items-center justify-center text-red-600 dark:text-red-400 mb-4">
              <X className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-850 dark:text-white">Application Failed</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">{applyError}</p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => setApplyError(null)}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <form onSubmit={handleApplySubmit} className="space-y-6">
            
            {/* Job Details Card */}
            <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-darkbg-100/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-500 text-white font-black text-lg flex items-center justify-center shadow-md shadow-brand-500/10 flex-shrink-0">
                  {selectedJob?.company.name[0]}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-850 dark:text-white text-base leading-snug">
                    {selectedJob?.title}
                  </h4>
                  <span className="text-xs font-semibold text-brand-650 dark:text-brand-400">
                    {selectedJob?.company.name} • {selectedJob?.location}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="brand" size="sm">
                  {selectedJob?.job_type.replace('_', ' ')}
                </Badge>
                <Badge variant="slate" size="sm">
                  {selectedJob?.experience_level} Level
                </Badge>
                {selectedJob && (selectedJob.salary_min || selectedJob.salary_max) && (
                  <span className="inline-flex items-center font-semibold rounded-full uppercase tracking-wider px-2 py-0.5 text-[10px] bg-violet-55 text-violet-650 border border-violet-500/25 dark:bg-violet-950/20 dark:text-violet-400">
                    💰 {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.currency)}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Job Description
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedJob?.description}
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Key Requirements
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob?.requirements.split(',').map((req, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-white dark:bg-darkbg-200 text-slate-600 dark:text-slate-400 text-xs border border-slate-100 dark:border-slate-800">
                      {req.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Saved Resume */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Resume for Application</label>
              <div className="p-4 rounded-xl border-2 border-brand-500 bg-brand-500/5 dark:bg-brand-950/10">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-500 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Use saved CareerKonnect resume</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Your generated resume is submitted automatically. Create or edit it from Resume Builder.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cover Letter Option */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="addCoverLetterCheckbox"
                  checked={addCoverLetter}
                  onChange={e => setAddCoverLetter(e.target.checked)}
                  className="accent-brand-500 rounded border-slate-300 dark:border-slate-800"
                />
                <label htmlFor="addCoverLetterCheckbox" className="text-xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer select-none">
                  Include a cover letter / introduction note
                </label>
              </div>

              {addCoverLetter && (
                <div>
                  <textarea 
                    placeholder="Write a brief cover letter or introduction notes for the recruiter..." 
                    required={addCoverLetter}
                    rows={4}
                    value={coverLetter}
                    onChange={e => setCoverLetter(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-sm leading-relaxed"
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full py-4 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/10 rounded-xl" isLoading={applying}>
              Submit Application
            </Button>
          </form>
        )}
      </Modal>

    </DashboardLayout>
  );
};

export default ExploreJobs;
