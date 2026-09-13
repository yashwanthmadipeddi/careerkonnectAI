import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../services/api';
import type { Company } from '../../types';
import { Building2, Plus } from 'lucide-react';

export const CompanyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Registration form
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({ name: '', website: '', description: '', industry: '', size: '1-10', location: '' });

  const fetchCompany = async () => {
    if (user?.profile.company) {
      try {
        const res = await api.get(`/companies/profiles/${user.profile.company.slug}/`);
        setCompany(res.data);
      } catch (err) {
        console.error("Failed to load company details:", err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompany();
  }, [user]);

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      await api.post('/companies/profiles/', form);
      alert("Company Profile Created successfully! Once verified by an Admin, recruiters can post active listings.");
      
      // Force refresh user session to reload company reference
      window.location.reload();
    } catch (err) {
      alert("Error creating company profile. Please ensure the name or slug is unique.");
    } finally {
      setIsRegistering(false);
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
      <div className="max-w-4xl mx-auto space-y-8">
        
        {company ? (
          <div className="space-y-6">
            <Card variant="glass" className="relative overflow-hidden bg-gradient-to-r from-brand-600/10 to-violet-600/10 dark:from-brand-950/20 dark:to-violet-950/20 border-brand-500/10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-brand-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 overflow-hidden">
                  {company.logo ? (
                    <img src={company.logo} alt="logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800 dark:text-white">{company.name}</h1>
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline mt-1 block">
                    {company.website}
                  </a>
                </div>
              </div>

              <div className="mt-6 flex gap-4 border-t border-slate-200/50 dark:border-slate-800/40 pt-4 text-sm text-slate-500 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-xs uppercase block text-slate-400">Verification</span>
                  <div className="mt-1">
                    {company.is_verified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="slate">Not verified</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-xs uppercase block text-slate-400">Industry</span>
                  <span className="mt-1 block font-bold text-slate-700 dark:text-slate-200">{company.industry || 'Tech'}</span>
                </div>
                <div>
                  <span className="font-semibold text-xs uppercase block text-slate-400">Size</span>
                  <span className="mt-1 block font-bold text-slate-700 dark:text-slate-200">{company.size} employees</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Company Description</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                {company.description || 'No description provided.'}
              </p>
            </Card>
          </div>
        ) : (
          <Card className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex w-12 h-12 rounded-xl bg-brand-50 text-brand-500 items-center justify-center mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Register Your Company</h2>
              <p className="text-xs text-slate-400 mt-1">
                Link your recruiter account to a Company Profile to post job listings.
              </p>
            </div>

            <form onSubmit={handleRegisterCompany} className="space-y-4">
              <Input label="Company Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <Input type="url" label="Website URL" placeholder="https://mycompany.com" required value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
              <Input label="Industry" placeholder="e.g. Software, Healthcare" required value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Company Size</label>
                  <select value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white">
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501+">501+ employees</option>
                  </select>
                </div>
                <Input label="Location" placeholder="e.g. San Francisco, CA" required value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Description</label>
                <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-sm" rows={3}></textarea>
              </div>

              <Button type="submit" className="w-full" isLoading={isRegistering} leftIcon={<Plus className="w-4 h-4" />}>
                Register Company
              </Button>
            </form>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
export default CompanyDashboard;
