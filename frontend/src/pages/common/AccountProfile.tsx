import React, { useEffect, useState } from 'react';
import { User, AlertCircle, CheckCircle2, Save, FileText, Sparkles, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface CandidateProfile { generated_resume_text?: string; resume_generated_at?: string | null; resume?: string | null; headline?: string; }

export const AccountProfile: React.FC = () => {
  const { user, updateUserProfile, refreshSession } = useAuth();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone_number: '', linkedin_url: '', github_url: '', portfolio_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCandidateProfile = async () => {
    if (user?.role !== 'candidate') return;
    try { setCandidate((await api.get('/candidates/profile/')).data); } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (user?.profile) setForm({
      first_name: user.profile.first_name || '', last_name: user.profile.last_name || '',
      phone_number: user.profile.phone_number || '', linkedin_url: user.profile.linkedin_url || '',
      github_url: user.profile.github_url || '', portfolio_url: user.profile.portfolio_url || '',
    });
    loadCandidateProfile();
  }, [user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(null); setSuccess(null);
    try { await updateUserProfile(form); await refreshSession(); await loadCandidateProfile(); setSuccess('Profile updated successfully.'); }
    catch (err: any) { setError(err?.detail || err?.first_name?.[0] || err?.last_name?.[0] || 'Could not update your profile.'); }
    finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2"><User className="w-7 h-7 text-brand-500" />Account Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account and resume profile.</p>
        </div>
        {error && <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium flex gap-2"><AlertCircle className="w-5 h-5" />{error}</div>}
        {success && <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-medium flex gap-2"><CheckCircle2 className="w-5 h-5" />{success}</div>}

        <Card>
          <div className="flex flex-col items-center pb-5 mb-5 border-b border-slate-100 dark:border-slate-800/60">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-brand-500/30 bg-slate-100 dark:bg-darkbg-100 flex items-center justify-center shadow-md">
              {user?.profile?.avatar ? (
                <img
                  src={user.profile.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-[10px] mt-1">No Photo</span>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Profile Photo
            </p>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-5">
            <div><p className="font-bold text-slate-800 dark:text-slate-200">{user?.email}</p><p className="text-xs text-slate-400 mt-0.5">Signed in account</p></div>
            <Badge variant="brand" size="sm">{user?.role}</Badge>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First Name" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
              <Input label="Last Name" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <Input label="Phone Number" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
            <Input label="LinkedIn URL" value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} />
            <Input label="GitHub URL" value={form.github_url} onChange={e => setForm({ ...form, github_url: e.target.value })} />
            <Input label="Portfolio URL" value={form.portfolio_url} onChange={e => setForm({ ...form, portfolio_url: e.target.value })} />
            <Button type="submit" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>Save Changes</Button>
          </form>
        </Card>

        {user?.role === 'candidate' && (
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-brand-500" />Resume</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Use the existing demo resume or create your own resume from your profile details.</p>
              </div>
              {candidate?.resume_generated_at && <Badge variant="success" size="sm">Ready</Badge>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <Link to="/resume-builder"><Button className="w-full" leftIcon={<FileText className="w-4 h-4" />}>Create Your Own Resume</Button></Link>
              <Link to="/ai-prep"><Button className="w-full" variant="outline" leftIcon={<Sparkles className="w-4 h-4" />}>Try Existing Demo Resume</Button></Link>
            </div>
            {candidate?.generated_resume_text && <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-darkbg-200 border border-slate-200 dark:border-slate-800"><div className="flex items-center justify-between gap-3 mb-2"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Saved generated resume</p><Link to="/ai-prep" className="text-xs font-semibold text-brand-500">Analyze <ExternalLink className="inline w-3 h-3" /></Link></div><pre className="text-xs whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-400 max-h-56 overflow-auto">{candidate.generated_resume_text}</pre></div>}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
export default AccountProfile;

