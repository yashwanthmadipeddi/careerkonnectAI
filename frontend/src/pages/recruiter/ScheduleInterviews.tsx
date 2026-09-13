import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, AlertCircle, Plus, Video } from 'lucide-react';

import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../services/api';
import type { Interview, JobApplication } from '../../types';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-sm';

/** Schedule Interviews page for the /interviews/schedule route. */
export const ScheduleInterviews: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    application: '', title: '', description: '',
    start_time: '', end_time: '', meet_link: '',
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ivRes, appRes] = await Promise.all([
        api.get('/interviews/schedules/'),
        api.get('/jobs/applications/'),
      ]);
      setInterviews(ivRes.data.results || ivRes.data || []);
      setApplications(appRes.data.results || appRes.data || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Could not load interviews. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/interviews/schedules/', form);
      setIsOpen(false);
      setForm({ application: '', title: '', description: '', start_time: '', end_time: '', meet_link: '' });
      await load();
    } catch (err: any) {
      const data = err?.response?.data;
      setError(
        data?.detail || data?.non_field_errors?.[0] || data?.application?.[0] ||
          'Could not schedule the interview. Check the times and try again.'
      );
    } finally {
      setSaving(false);
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

  const schedulable = applications.filter((a) => a.status !== 'rejected' && a.status !== 'withdrawn');

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-brand-500" />
              Schedule Interviews
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Book and track interviews with your applicants.
            </p>
          </div>
          <Button
            onClick={() => setIsOpen(true)}
            disabled={schedulable.length === 0}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Schedule Interview
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-sm font-medium flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {schedulable.length === 0 && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 dark:bg-darkbg-100/30 dark:border-slate-800 dark:text-slate-400 text-sm">
            You have no active applicants yet. Once candidates apply to your jobs
            you can schedule interviews with them here.
          </div>
        )}

        <Card>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-5">
            Upcoming & Past Interviews
          </h2>

          {interviews.length === 0 ? (
            <div className="text-center py-14 text-slate-400 dark:text-slate-500">
              <CalendarDays className="w-14 h-14 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No interviews scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interviews.map((iv) => (
                <div
                  key={iv.id}
                  className="p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-darkbg-100/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {iv.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {iv.application_details?.candidate?.email || 'Candidate'}
                      {iv.application_details?.job?.title
                        ? ` • ${iv.application_details.job.title}`
                        : ''}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(iv.start_time).toLocaleString()} →{' '}
                      {new Date(iv.end_time).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant={
                        iv.status === 'completed' ? 'success'
                          : iv.status === 'cancelled' ? 'danger' : 'brand'
                      }
                      size="sm"
                    >
                      {iv.status}
                    </Badge>
                    {iv.meet_link && (
                      <a href={iv.meet_link} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" leftIcon={<Video className="w-4 h-4" />}>
                          Join
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Schedule an Interview">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
              Applicant
            </label>
            <select
              required
              value={form.application}
              onChange={(e) => setForm({ ...form, application: e.target.value })}
              className={inputClass}
            >
              <option value="">Select an applicant...</option>
              {schedulable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.candidate?.email} — {a.job?.title}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Meeting Title"
            required
            placeholder="e.g. Technical System Design Interview"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Start"
              required
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
            <Input
              type="datetime-local"
              label="End"
              required
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>

          <Input
            type="url"
            label="Video Meeting Link"
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            value={form.meet_link}
            onChange={(e) => setForm({ ...form, meet_link: e.target.value })}
          />

          <Button type="submit" className="w-full" isLoading={saving}>
            Confirm Schedule
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default ScheduleInterviews;
