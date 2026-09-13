import React, { useEffect, useState } from 'react';
import { FileText, Sparkles, ArrowRight, Plus, Trash2, GraduationCap, Briefcase, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';

type Experience = { company_name:string; role:string; location:string; start_date:string; end_date:string; is_current:boolean; description:string };
type Education = { education_level:string; institution:string; degree:string; field_of_study:string; start_date:string; end_date:string; gpa:string; coursework:string; achievements:string };
type Project = { title:string; description:string; role:string; link:string };
type Certification = { name:string; issuing_organization:string; issue_date:string; credential_id:string; credential_url:string };

const blankExperience = (): Experience => ({company_name:'',role:'',location:'',start_date:'',end_date:'',is_current:false,description:''});
const blankEducation = (): Education => ({education_level:'Undergraduate',institution:'',degree:'',field_of_study:'',start_date:'',end_date:'',gpa:'',coursework:'',achievements:''});
const blankProject = (): Project => ({title:'',description:'',role:'',link:''});
const blankCertification = (): Certification => ({name:'',issuing_organization:'',issue_date:'',credential_id:'',credential_url:''});

export const ResumeBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);
  const [mode, setMode] = useState<'choice'|'builder'|'preview'>('choice');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [form, setForm] = useState<any>({ target_job_title:'', headline:'', summary:'', career_objective:'', skills:'', experience_years:'0', languages:'', achievements:'', preferred_location:'', work_preference:'Hybrid', profile:{first_name:'',last_name:'',phone_number:'',linkedin_url:'',github_url:'',portfolio_url:''}, experiences:[], educations:[], projects:[], certifications:[] });
  const [resumeText, setResumeText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const c=(await api.get('/candidates/profile/')).data; setCandidate(c); setResumeText(c.generated_resume_text || '');
        setForm({
          target_job_title:c.target_job_title||c.headline||'', headline:c.headline||'', summary:c.summary||'', career_objective:c.career_objective||'',
          skills:(c.skills||[]).join(', '), experience_years:String(c.experience_years||0), languages:(c.languages||[]).join(', '), achievements:(c.achievements||[]).join('\n'),
          preferred_location:c.preferred_location||'', work_preference:c.work_preference||'Hybrid',
          profile:{first_name:c.first_name||'',last_name:c.last_name||'',phone_number:'',linkedin_url:c.linkedin_url||'',github_url:c.github_url||'',portfolio_url:c.portfolio_url||''},
          experiences:(c.experiences||[]).map((x:any)=>({...blankExperience(),...x})),
          educations:(c.educations||[]).map((x:any)=>({...blankEducation(),...x})),
          projects:(c.projects||[]).map((x:any)=>({...blankProject(),...x})),
          certifications:(c.certifications||[]).map((x:any)=>({...blankCertification(),...x})),
        });
      } catch (e:any) { setError(e?.response?.data?.error || 'Could not load your candidate profile.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const makePayload = () => ({
    target_job_title: form.target_job_title,
    headline: form.headline || form.target_job_title,
    summary: form.summary,
    career_objective: form.career_objective,
    skills: form.skills.split(',').map((x:string)=>x.trim()).filter(Boolean),
    experience_years: Number(form.experience_years || 0),
    languages: form.languages.split(',').map((x:string)=>x.trim()).filter(Boolean),
    achievements: form.achievements.split('\n').map((x:string)=>x.trim()).filter(Boolean),
    preferred_location: form.preferred_location,
    work_preference: form.work_preference,
    profile: form.profile,
    experiences: form.experiences.filter((x:Experience)=>x.company_name.trim() && x.role.trim() && x.start_date),
    educations: form.educations.filter((x:Education)=>x.institution.trim() && x.degree.trim() && x.start_date).map((x:Education)=>({...x, gpa:x.gpa||null})),
    projects: form.projects.filter((x:Project)=>x.title.trim() && x.description.trim()),
    certifications: form.certifications.filter((x:Certification)=>x.name.trim() && x.issuing_organization.trim() && x.issue_date),
  });

  const generate = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try { const res=await api.post('/candidates/resume/generate/', makePayload()); setResumeText(res.data.resume_text); setCandidate(res.data.candidate); setSuccess('Resume created and saved to your profile.'); setMode('preview'); }
    catch(e:any){ setError(e?.response?.data?.error || e?.response?.data?.detail || 'Could not generate the resume.'); }
    finally { setSaving(false); }
  };

  if (loading) return <DashboardLayout><div className="py-20 text-center text-slate-400">Loading resume builder...</div></DashboardLayout>;

  if (mode==='choice') return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div><h1 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-7 h-7 text-brand-500"/>Resume Center</h1><p className="text-slate-500 dark:text-slate-400 mt-1">Choose a ready-made resume or build your own.</p></div>
        {error && <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border-brand-200 dark:border-brand-900">
            <Sparkles className="w-8 h-8 text-brand-500 mb-4"/><h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Try Existing Demo Resume</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Use the ready-made CareerKonnect resume already stored in your account and jump straight to ATS analysis.</p>
            <Button className="mt-5" onClick={()=>navigate('/ai-prep')} leftIcon={<ArrowRight className="w-4 h-4" />}>Use Existing Resume</Button>
          </Card>
          <Card className="p-6"><FileText className="w-8 h-8 text-violet-500 mb-4"/><h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Create Your Own Resume</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Enter education, undergraduate details, skills, projects, experience, certifications and more. CareerKonnect will generate and save the resume for you.</p><Button className="mt-5" variant="outline" onClick={()=>setMode('builder')}>Start Resume Builder</Button></Card>
        </div>
        {candidate?.generated_resume_text && <Card><p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Your current saved resume</p><pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-h-80 overflow-auto">{candidate.generated_resume_text}</pre></Card>}
      </div>
    </DashboardLayout>
  );

  if (mode==='preview') return (
    <DashboardLayout><div className="max-w-4xl mx-auto space-y-6"><div className="flex justify-between items-center"><div><h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">Resume Saved</h1><p className="text-slate-500 mt-1">This generated resume is now the source used by your ATS tools.</p></div><div className="flex gap-2"><Button variant="outline" onClick={()=>setMode('builder')}>Edit</Button><Button onClick={()=>navigate('/ai-prep')} leftIcon={<Sparkles className="w-4 h-4"/>}>Analyze with ATS</Button></div></div>{success&&<div className="p-4 rounded-xl bg-green-50 text-green-700 text-sm">{success}</div>}<Card><pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{resumeText}</pre></Card></div></DashboardLayout>
  );

  return (
    <DashboardLayout><div className="max-w-5xl mx-auto space-y-8"><div><h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">Create Your Own Resume</h1><p className="text-slate-500 dark:text-slate-400 mt-1">No resume upload required. Build the resume from your profile details.</p></div>
      {error&&<div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
      <Card><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input label="First Name" required value={form.profile.first_name} onChange={e=>setForm({...form,profile:{...form.profile,first_name:e.target.value}})}/><Input label="Last Name" required value={form.profile.last_name} onChange={e=>setForm({...form,profile:{...form.profile,last_name:e.target.value}})}/><Input label="Target Job Title" value={form.target_job_title} onChange={e=>setForm({...form,target_job_title:e.target.value})}/><Input label="Headline" value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})}/><Input label="Phone" value={form.profile.phone_number} onChange={e=>setForm({...form,profile:{...form.profile,phone_number:e.target.value}})}/><Input label="Preferred Location" value={form.preferred_location} onChange={e=>setForm({...form,preferred_location:e.target.value})}/><Input label="LinkedIn" value={form.profile.linkedin_url} onChange={e=>setForm({...form,profile:{...form.profile,linkedin_url:e.target.value}})}/><Input label="GitHub" value={form.profile.github_url} onChange={e=>setForm({...form,profile:{...form.profile,github_url:e.target.value}})}/><Input label="Portfolio" value={form.profile.portfolio_url} onChange={e=>setForm({...form,profile:{...form.profile,portfolio_url:e.target.value}})}/><Input label="Years of Experience" type="number" min="0" step="0.1" value={form.experience_years} onChange={e=>setForm({...form,experience_years:e.target.value})}/><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Work Preference</label><select value={form.work_preference} onChange={e=>setForm({...form,work_preference:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-300/70 dark:text-white"><option>Remote</option><option>Hybrid</option><option>Onsite</option><option>Flexible</option></select></div></div><div className="space-y-4 mt-6"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Professional Summary</label><textarea rows={4} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:text-white"/></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Career Objective</label><textarea rows={3} value={form.career_objective} onChange={e=>setForm({...form,career_objective:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:text-white"/></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Skills (comma separated)</label><textarea rows={3} value={form.skills} onChange={e=>setForm({...form,skills:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:text-white"/></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Languages (comma separated)</label><Input value={form.languages} onChange={e=>setForm({...form,languages:e.target.value})}/></div><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Achievements (one per line)</label><textarea rows={3} value={form.achievements} onChange={e=>setForm({...form,achievements:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:text-white"/></div></div></Card>

      <Card><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-extrabold flex items-center gap-2"><GraduationCap className="w-5 h-5 text-brand-500"/>Education</h2><Button size="sm" variant="outline" onClick={()=>setForm({...form,educations:[...form.educations,blankEducation()]})} leftIcon={<Plus className="w-4 h-4"/>}>Add Education</Button></div>{form.educations.map((x:Education,i:number)=><div key={i} className="border rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Education Level</label><select value={x.education_level} onChange={e=>{const a=[...form.educations];a[i]={...x,education_level:e.target.value};setForm({...form,educations:a})}} className="w-full px-4 py-3 rounded-xl border dark:bg-darkbg-300 dark:text-white"><option>Undergraduate</option><option>Postgraduate</option><option>Diploma</option><option>High School</option><option>Doctorate</option></select></div><Input label="Institution" value={x.institution} onChange={e=>{const a=[...form.educations];a[i]={...x,institution:e.target.value};setForm({...form,educations:a})}}/><Input label="Degree" value={x.degree} onChange={e=>{const a=[...form.educations];a[i]={...x,degree:e.target.value};setForm({...form,educations:a})}}/><Input label="Field of Study" value={x.field_of_study} onChange={e=>{const a=[...form.educations];a[i]={...x,field_of_study:e.target.value};setForm({...form,educations:a})}}/><Input label="Start Date" type="date" value={x.start_date} onChange={e=>{const a=[...form.educations];a[i]={...x,start_date:e.target.value};setForm({...form,educations:a})}}/><Input label="Graduation Date" type="date" value={x.end_date} onChange={e=>{const a=[...form.educations];a[i]={...x,end_date:e.target.value};setForm({...form,educations:a})}}/><Input label="CGPA / GPA" value={x.gpa} onChange={e=>{const a=[...form.educations];a[i]={...x,gpa:e.target.value};setForm({...form,educations:a})}}/><Input label="Relevant Coursework" value={x.coursework} onChange={e=>{const a=[...form.educations];a[i]={...x,coursework:e.target.value};setForm({...form,educations:a})}}/><Input label="Academic Achievements" value={x.achievements} onChange={e=>{const a=[...form.educations];a[i]={...x,achievements:e.target.value};setForm({...form,educations:a})}}/><button type="button" className="text-sm text-red-500 inline-flex gap-1 items-center" onClick={()=>setForm({...form,educations:form.educations.filter((_:any,j:number)=>j!==i)})}><Trash2 className="w-4 h-4"/>Remove</button></div>)}</Card>

      <Card><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-extrabold flex items-center gap-2"><Briefcase className="w-5 h-5 text-brand-500"/>Experience</h2><Button size="sm" variant="outline" onClick={()=>setForm({...form,experiences:[...form.experiences,blankExperience()]})} leftIcon={<Plus className="w-4 h-4"/>}>Add Experience</Button></div>{form.experiences.map((x:Experience,i:number)=><div key={i} className="border rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4"><Input label="Company" value={x.company_name} onChange={e=>{const a=[...form.experiences];a[i]={...x,company_name:e.target.value};setForm({...form,experiences:a})}}/><Input label="Role" value={x.role} onChange={e=>{const a=[...form.experiences];a[i]={...x,role:e.target.value};setForm({...form,experiences:a})}}/><Input label="Location" value={x.location} onChange={e=>{const a=[...form.experiences];a[i]={...x,location:e.target.value};setForm({...form,experiences:a})}}/><Input label="Start Date" type="date" value={x.start_date} onChange={e=>{const a=[...form.experiences];a[i]={...x,start_date:e.target.value};setForm({...form,experiences:a})}}/><Input label="End Date" type="date" disabled={x.is_current} value={x.end_date} onChange={e=>{const a=[...form.experiences];a[i]={...x,end_date:e.target.value};setForm({...form,experiences:a})}}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={x.is_current} onChange={e=>{const a=[...form.experiences];a[i]={...x,is_current:e.target.checked,end_date:e.target.checked?'':x.end_date};setForm({...form,experiences:a})}}/>Current role</label><textarea placeholder="Responsibilities and achievements" rows={4} value={x.description} onChange={e=>{const a=[...form.experiences];a[i]={...x,description:e.target.value};setForm({...form,experiences:a})}} className="md:col-span-2 w-full px-4 py-3 rounded-xl border dark:bg-darkbg-300 dark:text-white"/><button type="button" className="text-sm text-red-500 inline-flex gap-1 items-center" onClick={()=>setForm({...form,experiences:form.experiences.filter((_:any,j:number)=>j!==i)})}><Trash2 className="w-4 h-4"/>Remove</button></div>)}</Card>

      <Card><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-extrabold">Projects</h2><Button size="sm" variant="outline" onClick={()=>setForm({...form,projects:[...form.projects,blankProject()]})} leftIcon={<Plus className="w-4 h-4"/>}>Add Project</Button></div>{form.projects.map((x:Project,i:number)=><div key={i} className="border rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4"><Input label="Project Title" value={x.title} onChange={e=>{const a=[...form.projects];a[i]={...x,title:e.target.value};setForm({...form,projects:a})}}/><Input label="Role" value={x.role} onChange={e=>{const a=[...form.projects];a[i]={...x,role:e.target.value};setForm({...form,projects:a})}}/><Input label="Link" value={x.link} onChange={e=>{const a=[...form.projects];a[i]={...x,link:e.target.value};setForm({...form,projects:a})}}/><textarea placeholder="Project description" rows={4} value={x.description} onChange={e=>{const a=[...form.projects];a[i]={...x,description:e.target.value};setForm({...form,projects:a})}} className="md:col-span-2 w-full px-4 py-3 rounded-xl border dark:bg-darkbg-300 dark:text-white"/><button type="button" className="text-sm text-red-500 inline-flex gap-1 items-center" onClick={()=>setForm({...form,projects:form.projects.filter((_:any,j:number)=>j!==i)})}><Trash2 className="w-4 h-4"/>Remove</button></div>)}</Card>

      <Card><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-extrabold flex items-center gap-2"><Award className="w-5 h-5 text-brand-500"/>Certifications</h2><Button size="sm" variant="outline" onClick={()=>setForm({...form,certifications:[...form.certifications,blankCertification()]})} leftIcon={<Plus className="w-4 h-4"/>}>Add Certification</Button></div>{form.certifications.map((x:Certification,i:number)=><div key={i} className="border rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4"><Input label="Certification" value={x.name} onChange={e=>{const a=[...form.certifications];a[i]={...x,name:e.target.value};setForm({...form,certifications:a})}}/><Input label="Issuer" value={x.issuing_organization} onChange={e=>{const a=[...form.certifications];a[i]={...x,issuing_organization:e.target.value};setForm({...form,certifications:a})}}/><Input label="Issue Date" type="date" value={x.issue_date} onChange={e=>{const a=[...form.certifications];a[i]={...x,issue_date:e.target.value};setForm({...form,certifications:a})}}/><Input label="Credential ID" value={x.credential_id} onChange={e=>{const a=[...form.certifications];a[i]={...x,credential_id:e.target.value};setForm({...form,certifications:a})}}/><Input label="Credential URL" value={x.credential_url} onChange={e=>{const a=[...form.certifications];a[i]={...x,credential_url:e.target.value};setForm({...form,certifications:a})}}/><button type="button" className="text-sm text-red-500 inline-flex gap-1 items-center" onClick={()=>setForm({...form,certifications:form.certifications.filter((_:any,j:number)=>j!==i)})}><Trash2 className="w-4 h-4"/>Remove</button></div>)}</Card>
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={()=>setMode('choice')}>Back</Button><Button onClick={generate} isLoading={saving} leftIcon={<Sparkles className="w-4 h-4"/>}>Generate & Save Resume</Button></div>
    </div></DashboardLayout>
  );
};
export default ResumeBuilder;
