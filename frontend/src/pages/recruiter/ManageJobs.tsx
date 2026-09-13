import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings, Plus, Users, Pencil, Trash2, Eye, EyeOff,
  AlertCircle, Briefcase,
} from 'lucide-react';

import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../services/api';
import type { Job, JobApplication } from '../../types';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-sm';

/**
 * Manage Jobs page for the /jobs/manage route.
 *
 * Recruiters can view, edit, publish/unpublish and delete their own postings,
 * and see applicant counts. No admin approval is involved.
 */
export const ManageJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', requirements: '', location: '',
    job_type: 'full_time', experience_level: 'mid',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [applicantsFor, setApplicantsFor] = useState<Job | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        api.get('/jobs/listings/'),
        api.get('/jobs/applications/'),
      ]);
      setJobs(jobsRes.data.results || jobsRes.data || []);
      setApplications(appsRes.data.results || appsRes.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Could not load your job postings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const countFor = (jobId: string) =>
    applications.filter((a) => a.job?.id === jobId).length;

  const openEdit = (job: Job) => {
    setEditing(job);
    setEditForm({
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      location: job.location,
      job_type: job.job_type,
      experience_level: job.experience_level,
    });
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || savingEdit) return;
    setSavingEdit(true);
    setError(null);
    try {
      await api.patch(`/jobs/listings/${editing.id}/`, editForm);
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Could not save changes to this job.'
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (job: Job) => {
    setBusyId(job.id);
    setError(null);
    try {
      await api.patch(`/jobs/listings/${job.id}/`, { is_active: !job.is_active });
      await load();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Could not change the job status.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const removeJob = async (job: Job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    setBusyId(job.id);
    setError(null);
    try {
      await api.delete(`/jobs/listings/${job.id}/`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not delete this job.');
    } finally {
      setBusyId(null);
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Settings className="w-7 h-7 text-brand-500" />
              Manage Jobs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Edit, publish and track all of your postings.
            </p>
          </div>
          <Link to="/jobs/post">
            <Button leftIcon={<Plus className="w-4 h-4" />}>Post a Job</Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-sm font-medium flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <Card>
          {jobs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <Briefcase className="w-14 h-14 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No jobs posted yet.</p>
              <p className="text-sm mt-1">
                Use <Link to="/jobs/post" className="text-brand-500 hover:underline">Post a Job</Link> to publish your first opening.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">
                        {job.title}
                      </h4>
                      <Badge variant={job.is_active ? 'success' : 'slate'} size="sm">
                        {job.is_active ? 'Published' : 'Unpublished'}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400 block mt-1">
                      {job.location} • {job.job_type} • {job.experience_level}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                    <Badge variant="brand" size="sm">
                      {countFor(job.id)} applicants
                    </Badge>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setApplicantsFor(job)}
                      leftIcon={<Users className="w-4 h-4" />}
                    >
                      Applicants
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(job)}
                      leftIcon={<Pencil className="w-4 h-4" />}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === job.id}
                      onClick={() => toggleActive(job)}
                      leftIcon={
                        job.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
                      }
                    >
                      {job.is_active ? 'Unpublish' : 'Publish'}
                    </Button>

                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId === job.id}
                      onClick={() => removeJob(job)}
                      leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Edit modal */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit: ${editing?.title ?? ''}`}
        size="lg"
      >
        <form onSubmit={saveEdit} className="space-y-4">
          <Input
            label="Job Title"
            required
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          />
          <Input
            label="Location"
            required
            value={editForm.location}
            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Job Type</label>
              <select
                value={editForm.job_type}
                onChange={(e) => setEditForm({ ...editForm, job_type: e.target.value })}
                className={inputClass}
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Experience Level</label>
              <select
                value={editForm.experience_level}
                onChange={(e) => setEditForm({ ...editForm, experience_level: e.target.value })}
                className={inputClass}
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="lead">Lead / Management</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Description</label>
            <textarea
              required
              rows={5}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Requirements</label>
            <textarea
              required
              rows={3}
              value={editForm.requirements}
              onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
              className={inputClass}
            />
          </div>
          <Button type="submit" className="w-full" isLoading={savingEdit}>
            Save Changes
          </Button>
        </form>
      </Modal>

      {/* Applicants modal */}
      <Modal
        isOpen={!!applicantsFor}
        onClose={() => setApplicantsFor(null)}
        title={`Applicants: ${applicantsFor?.title ?? ''}`}
        size="lg"
      >
        {applications.filter((a) => a.job?.id === applicantsFor?.id).length === 0 ? (
          <p className="text-center py-8 text-slate-400 dark:text-slate-500">
            No applications received for this job yet.
          </p>
        ) : (
          <div className="space-y-3">
            {applications
              .filter((a) => a.job?.id === applicantsFor?.id)
              .map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-darkbg-100/10 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                      {app.candidate?.email || 'Candidate'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {app.ats_score !== null && app.ats_score !== undefined && (
                      <Badge variant={app.ats_score >= 70 ? 'success' : 'warning'} size="sm">
                        ATS {app.ats_score}%
                      </Badge>
                    )}
                    <Badge variant="slate" size="sm">{app.status}</Badge>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageJobs;
