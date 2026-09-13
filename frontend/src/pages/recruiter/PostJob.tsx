import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-sm';

const emptyForm = {
  title: '',
  description: '',
  requirements: '',
  location: '',
  job_type: 'full_time',
  experience_level: 'mid',
  salary_min: '',
  salary_max: '',
  currency: 'USD',
  is_active: true,
};

/**
 * Dedicated "Post a Job" page for the /jobs/post route.
 *
 * Recruiters can publish immediately: there is no admin approval or company
 * verification gate anywhere in this flow.
 */
export const PostJob: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const company = user?.profile?.company;

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccess(null);

    const companyId = company?.id;
    if (!companyId) {
      setError('Your company profile is missing. Please update your profile and try again.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        company: companyId,
      };
      // Django rejects empty strings for nullable decimals.
      if (!form.salary_min) delete payload.salary_min;
      if (!form.salary_max) delete payload.salary_max;

      const res = await api.post('/jobs/listings/', payload);
      setSuccess(`"${res.data.title}" was published successfully.`);
      setForm(emptyForm);
      setTimeout(() => navigate('/jobs/manage'), 900);
    } catch (err: any) {
      const data = err?.response?.data;
      const fieldError =
        data?.company?.[0] ||
        data?.salary_min?.[0] ||
        data?.salary_max?.[0] ||
        data?.job_type?.[0] ||
        data?.experience_level?.[0] ||
        data?.title?.[0] ||
        data?.location?.[0] ||
        data?.description?.[0] ||
        data?.requirements?.[0];

      setError(
        data?.detail ||
          data?.non_field_errors?.[0] ||
          fieldError ||
          'Could not create the job posting. Please review the fields and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-brand-500" />
            Post a Job
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Publish a new opening. It goes live immediately — no approval required.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-sm font-medium flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400 text-sm font-medium flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {success}
          </div>
        )}


        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Job Title"
              required
              placeholder="e.g. Senior Backend Engineer"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />

            <Input
              label="Location"
              required
              placeholder="e.g. Remote or Hyderabad, India"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                  Job Type
                </label>
                <select
                  value={form.job_type}
                  onChange={(e) => update('job_type', e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                  Experience Level
                </label>
                <select
                  value={form.experience_level}
                  onChange={(e) => update('experience_level', e.target.value)}
                  className={inputClass}
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="lead">Lead / Management</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                type="number"
                label="Minimum Salary"
                placeholder="e.g. 80000"
                value={form.salary_min}
                onChange={(e) => update('salary_min', e.target.value)}
              />
              <Input
                type="number"
                label="Maximum Salary"
                placeholder="e.g. 120000"
                value={form.salary_max}
                onChange={(e) => update('salary_max', e.target.value)}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => update('currency', e.target.value)}
                  className={inputClass}
                >
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                Job Description
              </label>
              <textarea
                required
                rows={6}
                placeholder="Describe the role, the team, and day-to-day responsibilities..."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                Requirements / Required Skills
              </label>
              <textarea
                required
                rows={4}
                placeholder="e.g. Python, Django, PostgreSQL, Docker, AWS"
                value={form.requirements}
                onChange={(e) => update('requirements', e.target.value)}
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update('is_active', e.target.checked)}
                className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
              />
              Publish immediately (visible in Explore Jobs)
            </label>

            <div className="flex gap-3">
              <Button
                type="submit"
                isLoading={submitting}
                disabled={submitting}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {submitting ? 'Publishing...' : 'Publish Job'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/jobs/manage')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PostJob;
