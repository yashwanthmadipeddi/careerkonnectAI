import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';
import type { JobApplication } from '../../types';
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  FileText,
  Filter,
  ExternalLink,
  Clock,
  UserCheck,
  XCircle,
  ChevronDown,
} from 'lucide-react';

type StatusFilter = 'all' | JobApplication['status'];

export const Applications: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/jobs/applications/');
      setApplications(res.data.results || res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load candidate applications:", err);
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filtered = applications.filter((app) => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'offered':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected':
      case 'withdrawn':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'interviewing':
        return <UserCheck className="w-4 h-4 text-brand-500" />;
      case 'screening':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Briefcase className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'offered':
        return 'success';
      case 'rejected':
      case 'withdrawn':
        return 'danger';
      case 'interviewing':
        return 'brand';
      case 'screening':
        return 'warning';
      default:
        return 'slate';
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-brand-500" />
              My Applications
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track the real-time review status of your job applications
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-4 h-4" />
            {applications.length} total
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-sm font-medium">
            {error}
            <Button variant="outline" size="sm" className="ml-3" onClick={fetchApplications}>
              Retry
            </Button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', count: applications.length },
            { key: 'applied', label: 'Applied', count: statusCounts['applied'] || 0 },
            { key: 'screening', label: 'Screening', count: statusCounts['screening'] || 0 },
            { key: 'interviewing', label: 'Interviewing', count: statusCounts['interviewing'] || 0 },
            { key: 'offered', label: 'Offered', count: statusCounts['offered'] || 0 },
            { key: 'rejected', label: 'Rejected', count: statusCounts['rejected'] || 0 },
            { key: 'withdrawn', label: 'Withdrawn', count: statusCounts['withdrawn'] || 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as StatusFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === tab.key
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-white dark:bg-darkbg-300 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Applications List */}
        {filtered.length === 0 ? (
          <Card className="text-center py-20 text-slate-400 dark:text-slate-500">
            <Briefcase className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No applications found</p>
            <p className="text-xs mt-1">
              {filter === 'all'
                ? "You haven't submitted any job applications yet."
                : `No applications with status "${filter}".`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => (
              <Card
                key={app.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelectedApp(app)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {app.job.title}
                      </h3>
                      <Badge variant={getStatusBadge(app.status)} size="sm">
                        {app.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-brand-500 font-medium">
                      {app.job.company.name} • {app.job.location}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        Applied {new Date(app.created_at).toLocaleDateString()}
                      </span>
                      {app.ats_score !== null && app.ats_score !== undefined && (
                        <span className="flex items-center gap-1 font-semibold text-brand-500">
                          ATS: {app.ats_score}%
                        </span>
                      )}
                      {app.job.job_type && (
                        <span className="capitalize">{app.job.job_type.replace('_', ' ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(app.status)}
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Application Detail Modal */}
        <Modal
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title={selectedApp ? `Application: ${selectedApp.job.title}` : ''}
          size="lg"
        >
          {selectedApp && (
            <div className="space-y-6">
              {/* Job Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">
                    {selectedApp.job.title}
                  </h3>
                  <p className="text-xs text-brand-500 font-medium mt-0.5">
                    {selectedApp.job.company.name} • {selectedApp.job.location}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                    {selectedApp.job.job_type && (
                      <span className="capitalize bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {selectedApp.job.job_type.replace('_', ' ')}
                      </span>
                    )}
                    {selectedApp.job.experience_level && (
                      <span className="capitalize bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {selectedApp.job.experience_level} level
                      </span>
                    )}
                    {(selectedApp.job.salary_min || selectedApp.job.salary_max) && (
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {selectedApp.job.salary_min && selectedApp.job.salary_max
                          ? `$${Number(selectedApp.job.salary_min).toLocaleString()} - $${Number(selectedApp.job.salary_max).toLocaleString()}`
                          : selectedApp.job.salary_min
                            ? `From $${Number(selectedApp.job.salary_min).toLocaleString()}`
                            : `Up to $${Number(selectedApp.job.salary_max).toLocaleString()}`}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={getStatusBadge(selectedApp.status)} size="md">
                  {selectedApp.status}
                </Badge>
              </div>

              {/* Timeline */}
              {selectedApp.status !== 'rejected' && selectedApp.status !== 'withdrawn' ? (
                <div className="flex items-center justify-between relative max-w-lg mx-auto py-2">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10"></div>
                  {['applied', 'screening', 'interviewing', 'offered'].map((step, idx) => {
                    const steps = ['applied', 'screening', 'interviewing', 'offered'];
                    const statusIndex = steps.indexOf(selectedApp.status);
                    const isCompleted = idx <= statusIndex;
                    const isCurrent = idx === statusIndex;
                    return (
                      <div key={step} className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          isCompleted
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : 'bg-white dark:bg-darkbg-300 border-slate-200 dark:border-slate-800 text-slate-400'
                        } relative z-10`}>
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                        </div>
                        <span className={`text-[10px] font-bold ${
                          isCurrent ? 'text-brand-500' : 'text-slate-400'
                        }`}>{step.charAt(0).toUpperCase() + step.slice(1)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`p-4 rounded-xl border text-xs font-semibold ${
                  selectedApp.status === 'rejected'
                    ? 'border-red-100 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400'
                }`}>
                  {selectedApp.status === 'rejected'
                    ? 'This application was not selected for the next stage.'
                    : 'You withdrew this application.'}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-400 block mb-0.5">Applied On</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(selectedApp.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-400 block mb-0.5">Last Updated</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(selectedApp.updated_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </span>
                </div>
                {selectedApp.ats_score !== null && selectedApp.ats_score !== undefined && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-slate-400 block mb-0.5">ATS Compatibility Score</span>
                    <span className={`font-black text-lg ${
                      selectedApp.ats_score >= 70 ? 'text-green-600' :
                      selectedApp.ats_score >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {selectedApp.ats_score}%
                    </span>
                  </div>
                )}
              </div>

              {/* Resume */}
              {selectedApp.resume && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {selectedApp.resume.split('/').pop()}
                    </span>
                  </div>
                  <a
                    href={selectedApp.resume}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                </div>
              )}

              {/* Cover Letter */}
              {selectedApp.cover_letter && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Cover Letter
                  </h4>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedApp.cover_letter}
                  </div>
                </div>
              )}

              {/* Job Description */}
              {selectedApp.job.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Job Description
                  </h4>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedApp.job.description}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {selectedApp.job.requirements && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Requirements
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.job.requirements.split(',').map((req, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] border border-slate-200 dark:border-slate-700"
                      >
                        {req.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History */}
              {selectedApp.status_history && selectedApp.status_history.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Status History
                  </h4>
                  <div className="space-y-3">
                    {selectedApp.status_history.map((history) => (
                      <div
                        key={history.id}
                        className="flex gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30"
                      >
                        <div className="mt-0.5">
                          <div className={`w-2 h-2 rounded-full ${
                            history.status === 'offered' ? 'bg-green-500' :
                            history.status === 'rejected' ? 'bg-red-500' :
                            history.status === 'interviewing' ? 'bg-brand-500' :
                            history.status === 'screening' ? 'bg-amber-500' :
                            'bg-slate-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                              {history.status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(history.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {history.comment && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              {history.comment}
                            </p>
                          )}
                          {history.changed_by_email && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              by {history.changed_by_email}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button variant="outline" onClick={() => setSelectedApp(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default Applications;
