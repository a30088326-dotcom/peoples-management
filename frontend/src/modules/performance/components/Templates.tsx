import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { RunAction, Template } from '../types';
import { performanceApi as api } from '../api/performanceApi';
import { newTemplate, uid } from '../utils/format';
import { withGoalWeight } from '../utils/weights';
import { Badge, Button, Card, Empty, Field, Heading, inputClass } from './UI';

const withoutDevelopment = (template: Template): Template => ({
  ...template,
  questions: template.questions.filter(question => !/^development$/i.test(question.section.trim())),
});

export default function Templates({ templates, run, admin }: { templates: Template[]; run: RunAction; admin: boolean }) {
  const [edit, setEdit] = useState<Template | null>(() => templates[0] ? withoutDevelopment(structuredClone(templates[0])) : null);
  const [creating, setCreating] = useState(false);
  const [section, setSection] = useState('Goals & outcomes');
  const [preview, setPreview] = useState(false);
  const [weightEditing, setWeightEditing] = useState(false);
  const [weightOriginal, setWeightOriginal] = useState<Template | null>(null);
  const [goalDraft, setGoalDraft] = useState('');
  const [competencyDraft, setCompetencyDraft] = useState('');
  const standardSections = ['Goals & outcomes', 'Key achievements', 'Competencies', 'Overall reflection'];
  const sections = [...standardSections, ...new Set((edit?.questions || []).map(q => q.section).filter(name => !standardSections.includes(name) && !/^development$/i.test(name.trim())))];
  const open = (t: Template, create: boolean) => { setEdit(withoutDevelopment(structuredClone(t))); setCreating(create); setSection('Goals & outcomes'); setPreview(false); setWeightEditing(false); setWeightOriginal(null); };
  const total = edit ? edit.goalWeight + edit.competencies.reduce((s, c) => s + c.weight, 0) : 0;
  const canEdit = Boolean(admin && edit && !edit.published);
  const questions = edit?.questions.filter(q => q.section === section) || [];
  const beginWeightEdit = () => {
    if (!edit || !admin || preview) return;
    const original = edit.published ? edit : null;
    if (original) open({ ...edit, id: uid(), name: `${edit.name} — updated weights`, published: false }, true);
    setWeightOriginal(original);
    setGoalDraft(String(edit.goalWeight));
    setCompetencyDraft(String(100 - edit.goalWeight));
    setWeightEditing(true);
  };
  const cancelWeightEdit = () => {
    if (weightOriginal) open(weightOriginal, false);
    else setWeightEditing(false);
    setWeightOriginal(null);
  };
  const changeWeight = (part: 'goals' | 'competencies', raw: string) => {
    const value = Number(raw);
    if (part === 'goals') setGoalDraft(raw);
    else setCompetencyDraft(raw);
    if (raw !== '' && Number.isFinite(value) && value >= 5 && value <= 95) {
      if (part === 'goals') setCompetencyDraft(String(100 - value));
      else setGoalDraft(String(100 - value));
    }
  };
  const parsedGoal = Number(goalDraft);
  const parsedCompetency = Number(competencyDraft);
  const weightsValid = goalDraft !== '' && competencyDraft !== '' &&
    Number.isFinite(parsedGoal) && Number.isFinite(parsedCompetency) &&
    parsedGoal >= 5 && parsedGoal <= 95 && parsedCompetency >= 5 && parsedCompetency <= 95 &&
    Math.abs(parsedGoal + parsedCompetency - 100) < .001;
  const displayedGoalWeight = edit && weightEditing && weightsValid ? parsedGoal : edit?.goalWeight ?? 70;
  const saveWeights = async () => {
    if (!edit || !weightsValid) return;
    const next = withGoalWeight(edit, parsedGoal);
    let saved: Template | null = null;
    const wasCreating = creating;
    if (await run(async () => { const response = await api.saveTemplate(next, wasCreating); saved = response.data.data as Template; },
      wasCreating ? 'New draft with updated weights saved. Publish it before using it in a new cycle.' : 'Scoring weights saved.')) {
      setEdit(saved || next);
      setCreating(false);
      setWeightEditing(false);
      setWeightOriginal(null);
    }
  };
  const save = async () => {
    if (!edit) return;
    let saved: Template | null = null;
    if (await run(async () => { const response = await api.saveTemplate(edit, creating); saved = response.data.data as Template; }, 'Template saved.')) {
      if (saved) setEdit(saved);
      setCreating(false);
    }
  };
  return <>
    <p className="mb-2 text-xs font-black uppercase tracking-[.15em] text-blue-600">Form builder</p>
    <Heading title={edit?.name || 'Review template builder'} description="Build the questions, competencies and scoring model used in a cycle.">
      {edit && <Button secondary onClick={() => setPreview(v => !v)}>{preview ? 'Edit form' : 'Preview form'}</Button>}
      {canEdit && <Button onClick={save} disabled={weightEditing || Math.abs(total - 100) > .001 || !edit?.questions.length}>Save template</Button>}
    </Heading>
    <div className="mb-5 flex flex-wrap items-center gap-3"><label className="min-w-56 flex-1 text-sm font-semibold text-slate-600">Template<select className={`${inputClass} mt-2`} value={creating ? '' : edit?.id || ''} onChange={e => { const found = templates.find(t => t.id === e.target.value); if (found) open(found, false); }}><option value="" disabled>{creating ? 'New unsaved template' : 'Select a template'}</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.published ? ' · Published' : ' · Draft'}</option>)}</select></label>{admin && <><Button secondary onClick={() => open(newTemplate(), true)}><Plus size={15}/>New template</Button>{edit && <Button secondary onClick={() => open({ ...edit, id: uid(), name: `${edit.name} — new version`, published: false }, true)}><Copy size={15}/>New version</Button>}</>}</div>
    {!edit ? <Empty title="No review templates yet">Create the standard 70% goals / 30% competencies template and tailor it to your team.</Empty> : <>
      {edit.published && <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Published templates are locked because existing reviews use them. Create a new version to make changes.</div>}
      <div className="grid items-start gap-5 lg:grid-cols-[286px_minmax(0,1fr)]">
        <Card className="lg:sticky lg:top-5">
          <h3 className="mb-4 text-sm font-bold">Template sections</h3>
          <div className="space-y-1">{sections.map((name,i) => <button key={name} onClick={() => setSection(name)} className={`block w-full rounded-xl px-3 py-3 text-left text-sm ${section === name ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>{i+1} · {name}</button>)}</div>
          <div className="mt-5 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between gap-2"><h4 className="text-xs font-black uppercase tracking-wide text-slate-400">Scoring weights</h4>{admin && !weightEditing && !preview && <button type="button" onClick={beginWeightEdit} className="text-xs font-bold text-blue-700 hover:underline">Edit weights</button>}</div>
            {weightEditing ? <div className="mt-3 space-y-3">
              {weightOriginal && <p className="rounded-lg bg-blue-50 p-2 text-xs text-blue-800">This published template is in use. Your changes will be saved as a new draft version; existing reviews stay unchanged.</p>}
              <label className="flex items-center justify-between gap-2 text-sm"><span>Goals</span><span className="flex items-center gap-1"><input aria-label="Goals scoring weight" type="number" min={5} max={95} step={1} className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right" value={goalDraft} onChange={e => changeWeight('goals', e.target.value)} />%</span></label>
              <label className="flex items-center justify-between gap-2 text-sm"><span>Competencies</span><span className="flex items-center gap-1"><input aria-label="Competencies scoring weight" type="number" min={5} max={95} step={1} className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right" value={competencyDraft} onChange={e => changeWeight('competencies', e.target.value)} />%</span></label>
              <p className={`flex justify-between border-t pt-3 text-sm font-bold ${weightsValid ? 'text-emerald-600' : 'text-rose-600'}`}>Total <span>{goalDraft && competencyDraft ? `${parsedGoal + parsedCompetency}%` : '—'}</span></p>
              <p className="text-xs text-slate-500">Changing either value adjusts the other and redistributes individual competency weights.</p>
              {!weightsValid && <p role="alert" className="text-xs text-rose-600">Each weight must be 5–95%, and together they must total 100%.</p>}
              <div className="flex flex-wrap gap-2"><Button onClick={saveWeights} disabled={!weightsValid}>Save weights</Button><Button secondary onClick={cancelWeightEdit}>Cancel</Button></div>
            </div> : <><p className="mt-3 flex justify-between text-sm">Goals <strong>{edit.goalWeight}%</strong></p><p className="mt-2 flex justify-between text-sm">Competencies <strong>{100-edit.goalWeight}%</strong></p><p className={`mt-3 flex justify-between border-t pt-3 text-sm font-bold ${Math.abs(total-100)<.001?'text-emerald-600':'text-rose-600'}`}>Total <span>{total}%</span></p></>}
          </div>
        </Card>
        <div className="space-y-5"><Card><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Section {sections.indexOf(section)+1}</p><h3 className="mt-2 text-xl font-bold">{section}</h3><p className="mt-1 text-sm text-slate-500">{section === 'Competencies' ? 'Competencies contribute to the final manager score.' : 'Employees reflect first; managers assess after the employee shares.'}</p></div><Badge>{section === 'Goals & outcomes' ? `${displayedGoalWeight}% of score` : section === 'Competencies' ? `${100-displayedGoalWeight}% of score` : `${questions.length} questions`}</Badge></div>
          {section === 'Competencies' ? <div className="space-y-3">{edit.competencies.map((c,index) => <div key={c.id} className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_100px_36px]"><Field label="Competency"><input disabled={!canEdit || preview} required className={inputClass} value={c.name} onChange={e => setEdit({ ...edit, competencies: edit.competencies.map((x,i) => i===index ? {...x,name:e.target.value}:x) })}/></Field><Field label="Weight %"><input disabled={!canEdit || preview} required type="number" min={1} max={95} className={inputClass} value={c.weight} onChange={e => setEdit({ ...edit, competencies: edit.competencies.map((x,i) => i===index ? {...x,weight:Number(e.target.value)}:x) })}/></Field>{canEdit && !preview && <button aria-label={`Remove ${c.name}`} onClick={() => setEdit({...edit,competencies:edit.competencies.filter(x=>x.id!==c.id)})}><Trash2 size={16}/></button>}</div>)}{canEdit && !preview && <button className="w-full rounded-xl border border-dashed border-blue-300 py-3 font-semibold text-blue-700" onClick={() => setEdit({...edit,competencies:[...edit.competencies,{id:uid(),name:'',description:'',weight:5}]})}>+ Add competency</button>}</div> : <div className="space-y-3">{questions.map((q,index) => <div key={q.id} className="rounded-xl border border-slate-200 p-4"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">{index+1}</span><div className="flex-1"><input aria-label="Question" disabled={!canEdit || preview} className={`${inputClass} font-semibold`} value={q.prompt} onChange={e => setEdit({...edit,questions:edit.questions.map(x=>x.id===q.id?{...x,prompt:e.target.value}:x)})}/><label className="mt-2 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" disabled={!canEdit || preview} checked={q.required} onChange={e=>setEdit({...edit,questions:edit.questions.map(x=>x.id===q.id?{...x,required:e.target.checked}:x)})}/>Required · Employee and manager answer</label></div>{canEdit && !preview && <button aria-label="Remove question" onClick={() => setEdit({...edit,questions:edit.questions.filter(x=>x.id!==q.id)})}><Trash2 size={16}/></button>}</div>{preview && <textarea disabled className={`${inputClass} mt-3`} placeholder="Response appears here"/>}</div>)}{!questions.length && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">No questions in this section yet.</p>}{canEdit && !preview && <button className="w-full rounded-xl border border-dashed border-blue-300 py-3 font-semibold text-blue-700" onClick={() => setEdit({...edit,questions:[...edit.questions,{id:uid(),section,prompt:'',required:true}]})}>+ Add {section.toLowerCase()} question</button>}</div>}
        </Card><Card><p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Template configuration</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Template name"><input className={inputClass} disabled={!canEdit || preview} value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></Field><Field label="Goals contribution (%)"><input type="number" min={5} max={95} className={inputClass} disabled={!canEdit || preview || weightEditing} value={displayedGoalWeight} onChange={e=>setEdit(withGoalWeight(edit, Number(e.target.value)))}/></Field></div><Field label="Description"><textarea className={inputClass} disabled={!canEdit || preview} value={edit.description} onChange={e=>setEdit({...edit,description:e.target.value})}/></Field><p className="mt-3 text-xs text-slate-500">Changing weights must keep the combined goal and competency total at 100%.</p></Card>{admin && !creating && <Card className="flex flex-wrap gap-2">{!edit.published && <Button onClick={() => run(() => api.publishTemplate(edit.id), 'Template published. It can now be used in a cycle.')}>Publish template</Button>}<Button secondary className="!text-red-600" onClick={() => { if (window.confirm('Delete this template? Existing cycles may prevent deletion.')) run(() => api.deleteTemplate(edit.id), 'Template deleted.'); }}><Trash2 size={15}/>Delete template</Button></Card>}</div>
      </div>
    </>}
  </>;
}
