import React, { useEffect, useState } from 'react';
import {
  Sparkles, FileText, Target, FileDown, Copy, Check, Search,
  AlertCircle, RefreshCw, FileType2,
} from 'lucide-react';

import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../services/api';

type Tab = 'analyzer' | 'gap' | 'cover';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:text-white text-sm';

/** Pull a useful message out of a DRF/axios error. */
const readError = (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (typeof data === 'string') return data;
  return data?.error || data?.detail || err?.message || fallback;
};

const scoreTone = (score: number) =>
  score >= 75 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 50 ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

const scoreRing = (score: number) =>
  score >= 75 ? 'border-emerald-500' : score >= 50 ? 'border-amber-500' : 'border-red-500';

/** Small list block used across result panels. */
const ListBlock: React.FC<{ title: string; items: string[]; tone?: string }> = ({
  title, items, tone = 'text-slate-600 dark:text-slate-400',
}) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className={`text-sm flex items-start gap-2 ${tone}`}>
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const ChipBlock: React.FC<{ title: string; items: string[]; variant: any }> = ({
  title, items, variant,
}) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <Badge key={s} variant={variant} size="sm">{s}</Badge>
        ))}
      </div>
    </div>
  );
};

export const AIPrep: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('analyzer');
  const [jobDescription, setJobDescription] = useState('');
  const [copied, setCopied] = useState(false);

  const [candidate, setCandidate] = useState<any>(null);
  const [fetchingCandidate, setFetchingCandidate] = useState(true);
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);

  // Per-feature state: idle -> loading -> success | error
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [gap, setGap] = useState<any>(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState<string | null>(null);

  const [cover, setCover] = useState<string | null>(null);
  const [coverMeta, setCoverMeta] = useState<any>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/candidates/profile/');
        setCandidate(res.data);
      } catch {
        /* profile is optional for the page to render */
      } finally {
        setFetchingCandidate(false);
      }
      try {
        const res = await api.get('/ai/status/');
        setAiStatus(res.data);
      } catch {
        /* status is advisory only */
      }
    })();
  }, []);

  /** AI Career Prep always uses the generated resume saved in the candidate profile. */
  const buildBody = () => ({
    body: jobDescription.trim()
      ? { job_description: jobDescription.trim() }
      : {},
    config: {},
  });

  const runAnalysis = async () => {
    if (analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const { body, config } = buildBody();
      const res = await api.post('/ai/resume-analyzer/', body, config);
      setAnalysis(res.data);
    } catch (err) {
      setAnalysisError(readError(err, 'Unable to analyze your resume. Please try again.'));
    } finally {
      setAnalysisLoading(false);
    }
  };

  const runSkillGap = async () => {
    if (gapLoading) return;
    setGapLoading(true);
    setGapError(null);
    setGap(null);
    try {
      const { body, config } = buildBody();
      const res = await api.post('/ai/skill-gap/', body, config);
      setGap(res.data);
    } catch (err) {
      setGapError(readError(err, 'Unable to analyze your skill gaps. Please try again.'));
    } finally {
      setGapLoading(false);
    }
  };

  const runCoverLetter = async () => {
    if (coverLoading) return;
    setCoverLoading(true);
    setCoverError(null);
    setCover(null);
    try {
      const { body, config } = buildBody();
      const res = await api.post('/ai/cover-letter/', body, config);
      setCover(res.data.content || res.data.cover_letter);
      setCoverMeta(res.data);
    } catch (err) {
      setCoverError(readError(err, 'Unable to generate a cover letter. Please try again.'));
    } finally {
      setCoverLoading(false);
    }
  };

  /** Download the generated letter as a real DOCX/PDF produced by the backend. */
  const downloadLetter = async (format: 'docx' | 'pdf') => {
    if (!cover || downloading) return;
    setDownloading(format);
    setCoverError(null);
    try {
      const res = await api.post(
        '/ai/cover-letter/export/',
        {
          content: cover,
          format,
          job_title: coverMeta?.job_title || '',
          company_name: coverMeta?.company_name || '',
        },
        { responseType: 'blob' }
      );

      const disposition = res.headers['content-disposition'] || '';
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match?.[1] || `Cover_Letter.${format}`;

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      // A blob error body must be read as text before it can be parsed.
      let message = 'Could not download the document. Please try again.';
      try {
        if (err?.response?.data instanceof Blob) {
          const parsed = JSON.parse(await err.response.data.text());
          message = parsed.error || parsed.detail || message;
        }
      } catch { /* keep the fallback */ }
      setCoverError(message);
    } finally {
      setDownloading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const busy = analysisLoading || gapLoading || coverLoading;
  const hasJD = jobDescription.trim().length > 0;

  const modeBadge = (mode?: string) =>
    mode === 'job_match'
      ? <Badge variant="brand" size="sm">Matched against job description</Badge>
      : <Badge variant="slate" size="sm">General resume analysis</Badge>;

  const ErrorPanel: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <Card>
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <p className="font-bold text-slate-700 dark:text-slate-300">Analysis failed</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">{message}</p>
        <Button className="mt-5" variant="outline" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Try Again
        </Button>
      </div>
    </Card>
  );

  const LoadingPanel: React.FC<{ label: string }> = ({ label }) => (
    <Card className="flex flex-col items-center justify-center py-20 gap-4">
      <Spinner size="lg" />
      <p className="text-slate-500 dark:text-slate-400 font-bold">{label}</p>
      <p className="text-xs text-slate-400">Using {aiStatus?.model || 'the configured AI model'}</p>
    </Card>
  );

  const EmptyPanel: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
    <Card>
      <div className="text-center py-16 text-slate-400 dark:text-slate-500">
        {icon}
        <p className="mt-3">{text}</p>
      </div>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-brand-500" />
            AI Career Prep Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Your saved profile resume is used automatically for ATS analysis, skill gaps and cover letters.
          </p>
        </div>

        {aiStatus && !aiStatus.configured && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 text-sm font-semibold flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            AI features are not configured on the server. Add GEMINI_API_KEY to backend/.env and restart Django.
          </div>
        )}

        {/* Summary cards. Scores show "Not analyzed" until a real analysis runs. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="glass" className="flex flex-col justify-between border-brand-500/10">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Candidate Profile & Resume
              </span>
              <h2 className="text-base font-extrabold text-slate-850 dark:text-white truncate">
                {fetchingCandidate ? (
                  <span className="inline-block w-24 h-4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
                ) : candidate ? (
                  `${candidate.first_name} ${candidate.last_name}`
                ) : 'Candidate'}
              </h2>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 truncate font-medium">
                {candidate?.headline || 'No headline set'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-350 truncate">
                {candidate?.generated_resume_text ? 'Generated CareerKonnect Resume' : 'No generated resume yet'}
              </span>
            </div>
          </Card>

          <Card variant="glass" className="flex items-center justify-between border-emerald-500/10">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                ATS Compatibility
              </span>
              <h3 className={`text-2xl font-black mt-1 ${analysis ? scoreTone(analysis.ats_score) : 'text-slate-400 dark:text-slate-500'}`}>
                {analysisLoading ? 'Analyzing…' : analysis ? `${analysis.ats_score}%` : 'Not analyzed'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 truncate font-medium">
                {analysis
                  ? (analysis.mode === 'job_match' ? 'Match against your job description' : 'General ATS readiness')
                  : 'Use your saved profile resume to analyze'}
              </p>
            </div>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-sm border-2 ${
              analysis ? `${scoreRing(analysis.ats_score)} ${scoreTone(analysis.ats_score)}`
                : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
            }`}>
              {analysis ? `${analysis.ats_score}` : '--'}
            </div>
          </Card>

          <Card variant="glass" className="flex items-center justify-between border-violet-500/10">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Cover Letter
              </span>
              <h3 className={`text-2xl font-black mt-1 ${cover ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {coverLoading ? 'Writing…' : cover ? 'Generated' : 'Not generated'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 truncate font-medium">
                {cover ? `${cover.split(/\s+/).length} words ready to download` : 'Generate a tailored letter'}
              </p>
            </div>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
              cover ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
            }`}>
              <FileDown className="w-6 h-6" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2">
          {([
            { id: 'analyzer', label: 'ATS Resume Analyzer', icon: <FileText className="w-4 h-4" /> },
            { id: 'gap', label: 'AI Skill Gap Analyzer', icon: <Target className="w-4 h-4" /> },
            { id: 'cover', label: 'AI Cover Letter Generator', icon: <FileDown className="w-4 h-4" /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              className={`py-3.5 px-5 font-bold text-sm border-b-2 flex items-center gap-2 transition-all flex-shrink-0 ${
                activeTab === t.id
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Inputs */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-brand-500" />
                Analysis Inputs
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider mb-2">
                    Saved Resume
                  </label>
                  <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900/40 dark:bg-brand-950/20">
                    {candidate?.generated_resume_text ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                              Generated Resume
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              This saved resume is used automatically by all AI tools.
                            </p>
                          </div>
                          <Badge variant="success" size="sm">Ready</Badge>
                        </div>
                        <Link to="/resume-builder" className="inline-flex items-center mt-3 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                          Edit or replace resume →
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No generated resume yet</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Create your resume from your profile details before running ATS analysis.
                        </p>
                        <Link to="/resume-builder" className="inline-flex items-center mt-3 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                          Create your resume →
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider mb-2">
                    Target Job Description <span className="normal-case font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    placeholder="Paste a job description to score against it. Leave blank for a general resume analysis."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={8}
                    className={inputClass}
                  />
                  <p className="text-[11px] text-slate-400 mt-2">
                    {hasJD
                      ? 'Mode: job-specific match'
                      : 'Mode: general resume analysis'}
                  </p>
                </div>

                {activeTab === 'analyzer' && (
                  <Button className="w-full" onClick={runAnalysis} isLoading={analysisLoading} disabled={busy} leftIcon={<Sparkles className="w-4 h-4" />}>
                    {analysis ? 'Re-analyze Resume' : 'Analyze Resume'}
                  </Button>
                )}
                {activeTab === 'gap' && (
                  <Button className="w-full" onClick={runSkillGap} isLoading={gapLoading} disabled={busy} leftIcon={<Sparkles className="w-4 h-4" />}>
                    {gap ? 'Recalculate Skill Gaps' : 'Calculate Skill Gaps'}
                  </Button>
                )}
                {activeTab === 'cover' && (
                  <Button className="w-full" onClick={runCoverLetter} isLoading={coverLoading} disabled={busy} leftIcon={<Sparkles className="w-4 h-4" />}>
                    {cover ? 'Regenerate Cover Letter' : 'Generate Cover Letter'}
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* ATS analyzer */}
            {activeTab === 'analyzer' && (
              analysisLoading ? <LoadingPanel label="Analyzing your resume with AI..." />
                : analysisError ? <ErrorPanel message={analysisError} onRetry={runAnalysis} />
                  : analysis ? (
                    <Card>
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800/60 pb-6">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">ATS Compatibility</h3>
                            <div className="mt-2">{modeBadge(analysis.mode)}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center font-black text-2xl ${scoreRing(analysis.ats_score)} ${scoreTone(analysis.ats_score)}`}>
                              {analysis.ats_score}%
                            </div>
                            <div>
                              <Badge variant={analysis.ats_score >= 70 ? 'success' : analysis.ats_score >= 50 ? 'warning' : 'danger'}>
                                ATS {analysis.ats_score}
                              </Badge>
                              <span className="text-xs text-slate-400 block mt-1">
                                Resume quality: {analysis.resume_score}
                              </span>
                            </div>
                          </div>
                        </div>

                        {analysis.match_analysis && (
                          <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2">Assessment</h4>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                              {analysis.match_analysis}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <ChipBlock title="Skills Detected" items={analysis.skills_detected} variant="brand" />
                          <ChipBlock title="Matched Skills" items={analysis.matched_skills} variant="success" />
                          <ChipBlock title="Missing Skills" items={analysis.missing_skills} variant="danger" />
                          <ChipBlock title="Matched Keywords" items={analysis.matched_keywords} variant="success" />
                          <ChipBlock title="Missing Keywords" items={analysis.missing_keywords} variant="warning" />
                          <ChipBlock title="Missing Sections" items={analysis.missing_sections} variant="warning" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <ListBlock title="Strengths" items={analysis.strengths} tone="text-emerald-700 dark:text-emerald-400" />
                          <ListBlock title="Weaknesses" items={analysis.weaknesses} tone="text-red-700 dark:text-red-400" />
                        </div>

                        <ListBlock title="Formatting Concerns" items={analysis.formatting_issues} />

                        {analysis.improvement_suggestions?.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3">Recommendations</h4>
                            <ul className="space-y-2">
                              {analysis.improvement_suggestions.map((s: string, i: number) => (
                                <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <EmptyPanel
                      icon={<FileText className="w-14 h-14 mx-auto opacity-30" />}
                      text="Use the saved/generated resume from your profile to begin AI analysis."
                    />
                  )
            )}

            {/* Skill gap */}
            {activeTab === 'gap' && (
              gapLoading ? <LoadingPanel label="Analyzing your skill gaps..." />
                : gapError ? <ErrorPanel message={gapError} onRetry={runSkillGap} />
                  : gap ? (
                    <Card>
                      <div className="space-y-6 animate-fade-in">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Skill Gap Analysis</h3>
                          <div className="mt-2">{modeBadge(gap.mode)}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <ChipBlock title="Skills You Have" items={gap.matched_skills} variant="success" />
                          <ChipBlock title="Partially Matched" items={gap.partial_skills} variant="warning" />
                          <ChipBlock title="Technical Skills" items={gap.technical_skills} variant="brand" />
                          <ChipBlock title="Soft Skills" items={gap.soft_skills} variant="slate" />
                        </div>

                        {gap.missing_skills?.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3">Missing Skills</h4>
                            <div className="space-y-2">
                              {gap.missing_skills.map((item: any, i: number) => (
                                <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/20 flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-slate-700 dark:text-slate-300 text-xs">{item.skill}</h5>
                                    {item.resource_suggestion && (
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                                        {item.resource_suggestion}
                                      </span>
                                    )}
                                  </div>
                                  <Badge
                                    variant={item.priority === 'High' ? 'danger' : item.priority === 'Low' ? 'slate' : 'warning'}
                                    size="sm"
                                  >
                                    {item.priority}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <ListBlock title="Priority Gaps" items={gap.priority_gaps} tone="text-red-700 dark:text-red-400" />
                        <ChipBlock title="Recommended Technologies" items={gap.recommended_technologies} variant="brand" />
                        <ListBlock title="Recommendations" items={gap.recommendations} />

                        {gap.action_plan?.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3">Recommended Learning Order</h4>
                            <div className="space-y-3">
                              {gap.action_plan.map((step: string, i: number) => (
                                <div key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                                  <span className="font-black text-brand-500">{i + 1}.</span>
                                  <p>{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <EmptyPanel
                      icon={<Target className="w-14 h-14 mx-auto opacity-30" />}
                      text="Use the saved/generated resume from your profile to identify skill gaps."
                    />
                  )
            )}

            {/* Cover letter */}
            {activeTab === 'cover' && (
              coverLoading ? <LoadingPanel label="Writing your cover letter..." />
                : coverError && !cover ? <ErrorPanel message={coverError} onRetry={runCoverLetter} />
                  : cover ? (
                    <Card>
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Your Cover Letter</h3>
                            <div className="mt-2">{modeBadge(coverMeta?.mode === 'job_match' ? 'job_match' : undefined)}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(cover)}
                              leftIcon={copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}>
                              {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={runCoverLetter} disabled={busy}
                              leftIcon={<RefreshCw className="w-4 h-4" />}>
                              Regenerate
                            </Button>
                            <Button size="sm" onClick={() => downloadLetter('docx')} isLoading={downloading === 'docx'} disabled={!!downloading}
                              leftIcon={<FileType2 className="w-4 h-4" />}>
                              DOCX
                            </Button>
                            <Button size="sm" onClick={() => downloadLetter('pdf')} isLoading={downloading === 'pdf'} disabled={!!downloading}
                              leftIcon={<FileDown className="w-4 h-4" />}>
                              PDF
                            </Button>
                          </div>
                        </div>

                        {coverError && (
                          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-xs font-medium">
                            {coverError}
                          </div>
                        )}

                        <pre className="font-sans text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-50/50 dark:bg-darkbg-200/20 p-6 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
                          {cover}
                        </pre>
                      </div>
                    </Card>
                  ) : (
                    <EmptyPanel
                      icon={<FileDown className="w-14 h-14 mx-auto opacity-30" />}
                      text="Generate a personalized cover letter from your saved profile resume."
                    />
                  )
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIPrep;
