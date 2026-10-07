import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { Bot, Send, X, Maximize2, Minimize2, RefreshCw, ShieldCheck, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api/client';
import { useAuth } from '../../context/AuthContext';
import './assistant.css';
import './assistant-intent.css';

type Field = { name: string; label: string; type?: string; required?: boolean; options?: string[]; placeholder?: string };
export type Capability = { id: string; label: string; description: string; module: string; risk: string; examples: string[]; fields: Field[] };
type Reply = { kind: string; conversationId?: string; result?: any; tool?: Capability; values?: any; message?: string; actionId?: string; summary?: string; interpretedAs?: string; spellingAdjusted?: boolean };
type Entry = { id: string; role: string; text?: string; reply?: Reply; done?: boolean };
type AssistantState = { updates: any[]; updatesError: boolean; dismissUpdate: (id: string) => Promise<void>; capabilities: any; capabilitiesLoading: boolean; capabilitiesError: boolean; entries: Entry[]; busy: boolean; open: boolean; setOpen: (v: boolean) => void; send: (message: string) => Promise<void>; invoke: (tool: string, args: any) => Promise<void>; choose: (tool: Capability) => void; confirm: (id: string, cancel?: boolean) => Promise<void>; refresh: () => Promise<void>; reset: () => void };
const Context = createContext<AssistantState | null>(null);
export const useAssistant = () => useContext(Context)!;
export function goToAssistantLink(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return;
  const next = new URL(path, window.location.origin); if (next.origin !== window.location.origin) return;
  window.history.pushState({}, '', next.pathname + next.search + next.hash);
  window.dispatchEvent(new PopStateEvent('popstate')); window.dispatchEvent(new HashChangeEvent('hashchange'));
}
export function AssistantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // A login change must discard chat, pending confirmations and late responses
  // belonging to the previous employee, including the floating assistant.
  return <AssistantSession key={user?.id || 'signed-out'}>{children}</AssistantSession>;
}
function AssistantSession({ children }: { children: ReactNode }) {
  const { user } = useAuth(); const eligible = !!user && ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'].includes(user.role);
  const [capabilities, setCapabilities] = useState<any>(null); const [entries, setEntries] = useState<Entry[]>([]);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false); const [capabilitiesError, setCapabilitiesError] = useState(false);
  const [busy, setBusy] = useState(false); const [open, setOpen] = useState(false);
  const workflow = useWorkflowUpdates(eligible);
  const conversation = useRef<string | undefined>(undefined); const working = useRef(false);
  const append = (entry: Omit<Entry, 'id'>) => setEntries(old => [...old.slice(-79), { id: crypto.randomUUID(), ...entry }]);
  const refresh = async () => {
    if (!eligible) return;
    setCapabilitiesLoading(true); setCapabilitiesError(false);
    for (let attempt = 0; attempt < 3; attempt++) {
      try { const r = await api.get('/api/assistant/capabilities'); setCapabilities(r.data.data); setCapabilitiesLoading(false); return; }
      catch { if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1))); }
    }
    setCapabilitiesError(true); setCapabilitiesLoading(false);
  };
  useEffect(() => { void refresh(); const handler = () => void refresh(); window.addEventListener('focus', handler); window.addEventListener('assistant-updated', handler); return () => { window.removeEventListener('focus', handler); window.removeEventListener('assistant-updated', handler); }; }, [user]);
  async function request(path: string, body: any, completed?: string) {
    if (working.current) return; working.current = true; setBusy(true); setOpen(true);
    try {
      const r = await api.post(`/api/assistant/${path}`, body, { timeout: 45000 }); const reply = r.data.data as Reply;
      if (reply.conversationId) conversation.current = reply.conversationId;
      if (completed) setEntries(old => old.map(e => e.reply?.actionId === completed ? { ...e, done: true } : e));
      append({ role: 'assistant', reply });
      if (completed) window.dispatchEvent(new Event('assistant-updated'));
    } catch (e: any) { append({ role: 'assistant', text: e.response?.data?.message || 'No completion response received. Check action history before retrying a change.' }); }
    finally { working.current = false; setBusy(false); }
  }
  const send = async (message: string) => {
    if (!message.trim() || working.current) return;
    const secret = /\b(?:passwords?|passcodes?|passphrases?|secrets?|tokens?|api[ _-]?keys?|one[ _-]?codes?|otps?|pins?)\b/i.test(message);
    append({ role: 'user', text: secret ? '[Credential-related message omitted. Use the secure password form.]' : message });
    await request('message', { message: secret ? 'Change my password' : message, conversationId: conversation.current, requestId: crypto.randomUUID() });
  };
  const invoke = async (tool: string, args: any) => request('invoke', { tool, args, conversationId: conversation.current, requestId: crypto.randomUUID() });
  const choose = (tool: Capability) => { setOpen(true); if (!tool.fields.length) void invoke(tool.id, {}); else append({ role: 'assistant', reply: { kind: 'form', tool, values: {} } }); };
  const reset = () => { if (working.current) return; conversation.current = undefined; setEntries([]); };
  return <Context.Provider value={{ updates:workflow.items, updatesError:workflow.error, dismissUpdate:workflow.dismiss, capabilities, capabilitiesLoading, capabilitiesError, entries, busy, open, setOpen, send, invoke, choose, confirm: async (id, cancel) => request(`actions/${id}/${cancel ? 'cancel' : 'confirm'}`, {}, id), refresh, reset }}>{children}</Context.Provider>;
}
export function ActionForm({ tool, values = {}, onSubmit }: { tool: Capability; values?: any; onSubmit: (args: any) => Promise<void> }) {
  const { busy } = useAssistant(); const [input, setInput] = useState<Record<string, any>>(values); const [error, setError] = useState('');
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); try { const args: any = {}; for (const field of tool.fields) { const value = input[field.name]; if (value === '' || value === undefined) { if (field.required) throw new Error(`${field.label} is required.`); continue; } args[field.name] = field.type === 'json' ? (typeof value === 'string' ? JSON.parse(value) : value) : field.type === 'number' ? Number(value) : value; } await onSubmit(args); } catch (e: any) { setError(e.message); } }
  return <form onSubmit={submit} className="hrbot-form"><h3>{tool.label}</h3><p>{tool.description}</p>{tool.fields.map(f => <label key={f.name}>{f.label}{f.required ? ' *' : ''}{f.type === 'select' ? <select required={f.required} value={input[f.name] ?? ''} onChange={e => setInput(v => ({ ...v, [f.name]: e.target.value }))}><option value="">Select…</option>{f.options?.map(o => <option key={o}>{o}</option>)}</select> : f.type === 'checkbox' ? <input type="checkbox" checked={!!input[f.name]} onChange={e => setInput(v => ({ ...v, [f.name]: e.target.checked }))} /> : f.type === 'textarea' || f.type === 'json' ? <textarea rows={3} required={f.required} value={typeof input[f.name] === 'object' ? JSON.stringify(input[f.name], null, 2) : input[f.name] ?? ''} placeholder={f.type === 'json' ? '{}' : f.placeholder} onChange={e => setInput(v => ({ ...v, [f.name]: e.target.value }))} /> : <input required={f.required} type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} step="any" value={input[f.name] ?? ''} placeholder={f.placeholder} onChange={e => setInput(v => ({ ...v, [f.name]: e.target.value }))} />}</label>)}{error && <p role="alert">{error}</p>}<button className="hrbot-primary" disabled={busy}>{tool.risk === 'read' ? 'Run action' : 'Preview change'}</button></form>;
}
function ResultView({ result, onAction }: { result: any, onAction: (tool: string, args: any) => Promise<void> }) {
  if (!result) return null;
  function download() { const blob = new Blob([result.download.content], { type: result.download.mime }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = result.download.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <div className="hrbot-result"><p>{result.message}</p>{result.recordId && <small>Record: {result.recordId}</small>}{result.cards?.map((card: any, i: number) => <div className="hrbot-card" key={i}><h4>{card.title}</h4><dl>{card.values.map((v: any, n: number) => <div key={n}><dt>{v.label}</dt><dd>{v.value || '—'}</dd></div>)}</dl>{card.actions && <div className="hrbot-links">{card.actions.map((act: any, j: number) => <button key={j} onClick={() => onAction(act.tool, act.args)}>{act.label}</button>)}</div>}</div>)}{result.table && <div className="hrbot-table"><table><thead><tr>{result.table.columns.map((c: string, i: number) => <th key={i}>{c}</th>)}</tr></thead><tbody>{result.table.rows.map((row: string[], i: number) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell || '—'}</td>)}</tr>)}</tbody></table>{!result.table.rows.length && <p>No matching records.</p>}</div>}<div className="hrbot-links">{result.links?.map((link: any, i: number) => <button key={i} onClick={() => goToAssistantLink(link.path)}>{link.label} →</button>)}{result.download && <button onClick={download}>Download {result.download.name}</button>}</div></div>;
}
function useWorkflowUpdates(eligible: boolean) {
  const [items, setItems] = useState<any[]>([]); const [error, setError] = useState(false);
  useEffect(() => {
    if (!eligible) return;
    let live = true, loading = false;
    const load = async () => { if (loading) return; loading = true; try { const r = await api.get('/api/assistant/notifications'); if (live) { setItems(r.data.data); setError(false); } } catch { if (live) setError(true); } finally { loading = false; } };
    void load(); const timer = window.setInterval(load, 30000);
    window.addEventListener('focus', load); window.addEventListener('assistant-updated', load);
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus',load); window.removeEventListener('assistant-updated',load); };
  }, [eligible]);
  async function dismiss(id: string) { try { await api.post(`/api/assistant/notifications/${id}/read`,{}); setItems(old => old.filter(x => x.id !== id)); } catch { setError(true); } }
  return { items, error, dismiss };
}
function AssistantUpdates() {
  const {updates: items, updatesError: error, dismissUpdate: dismiss} = useAssistant();
  const [tab, setTab] = useState<'pending' | 'updates'>('pending');
  const pending = items.filter(item => item.pending);
  const news = items.filter(item => !item.pending);
  const visible = tab === 'pending' ? pending : news;
  return <aside className="hrbot-updates" aria-label="Workflow updates" aria-live="polite">
    <div className="hrbot-inbox-tabs"><button aria-pressed={tab === 'pending'} onClick={() => setTab('pending')}>Pending requests ({pending.length})</button><button aria-pressed={tab === 'updates'} onClick={() => setTab('updates')}>Updates ({news.length})</button></div>
    {error && <small>Updates could not be refreshed. Retrying automatically.</small>}
    {!visible.length && !error && <small>{tab === 'pending' ? 'No requests awaiting your review.' : 'No unread updates.'} Checks every 30 seconds.</small>}
    {!!pending.length && tab === 'pending' && <small>Requests stay here until approved, rejected or otherwise resolved.</small>}
    {visible.map(item => <div key={item.id}><p>{item.message}</p><button onClick={() => goToAssistantLink(item.path)}>{item.pending ? 'Review request →' : 'Open →'}</button>{!item.pending && <button onClick={() => void dismiss(item.id)}>Mark read</button>}</div>)}
  </aside>;
}
function Conversation() { return <><AssistantUpdates /><ChatConversation /></>; }
function ChatConversation() {
  const a = useAssistant(); const [message, setMessage] = useState(''); const scrollbox = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollbox.current) scrollbox.current.scrollTop = scrollbox.current.scrollHeight; }, [a.entries, a.busy]);
  return <div className="hrbot-conversation"><div className="hrbot-messages" ref={scrollbox} aria-live="polite">{!a.entries.length && <div className="hrbot-welcome"><Bot size={34} /><h2>How can I help?</h2><p>{a.capabilities?.welcome || 'Ask in English or choose an available action.'}</p><small>Understands common typos and incomplete English commands • No external AI connected</small><div className="hrbot-suggestions">{(a.capabilities?.tools || []).filter((t: Capability) => t.examples.length).slice(0, 4).map((t: Capability) => <button key={t.id} onClick={() => void a.send(t.examples[0])}>{t.examples[0]}</button>)}</div></div>}{a.entries.map(e => <div key={e.id} className={`hrbot-message hrbot-${e.role}`}>{e.text && <p>{e.text}</p>}{e.reply?.interpretedAs && <p className="hrbot-interpreted">Understood as: <strong>{e.reply.interpretedAs}</strong>{e.reply.spellingAdjusted ? ' (spelling adjusted)' : ''}</p>}{e.reply?.message && e.reply.kind === 'form' && <p className="hrbot-form-note">{e.reply.message}</p>}{e.reply?.kind === 'result' && <ResultView result={e.reply.result} onAction={(tool, args) => a.invoke(tool, args)} />}{e.reply?.kind === 'form' && e.reply.tool && <ActionForm tool={e.reply.tool} values={e.reply.values} onSubmit={args => a.invoke(e.reply!.tool!.id, args)} />}{e.reply?.kind === 'confirmation' && <div className="hrbot-confirm"><ShieldCheck size={22} /><h3>Confirm this change</h3><p>{e.reply.summary}</p><small>Preview expires in 10 minutes. Permissions and target data are checked again before saving.</small>{e.done ? <p>Confirmation handled. See the result below.</p> : <div className="hrbot-links"><button className="hrbot-primary" disabled={a.busy} onClick={() => void a.confirm(e.reply!.actionId!)}>Confirm & save</button><button disabled={a.busy} onClick={() => void a.confirm(e.reply!.actionId!, true)}>Cancel</button></div>}</div>}</div>)}{a.busy && <p className="hrbot-working">Checking Peoples Management…</p>}</div><form className="hrbot-composer" onSubmit={e => { e.preventDefault(); if (message.trim()) { void a.send(message); setMessage(''); } }}><input aria-label="English HR command" value={message} maxLength={4000} onChange={e => setMessage(e.target.value)} placeholder="Ask in English…" disabled={a.busy} /><button type="submit" className="hrbot-primary" title="Send command" disabled={a.busy || !message.trim()}><Send size={18} /></button></form><small className="hrbot-disclaimer">Only your permitted actions. Never enter passwords here.</small></div>;
}
export function FloatingAssistant({ page }: { page: string }) {
  const a = useAssistant(); const { user } = useAuth(); const [expanded, setExpanded] = useState(false);
  if (!user || user.role === 'CANDIDATE' || page === 'assistant') return null;
  return <div className="hrbot"><motion.div drag dragMomentum={false} dragListener={!a.open} className={`hrbot-floating ${expanded ? 'hrbot-expanded' : ''}`}>{a.open ? <><header><span><Bot size={20} /> {a.capabilities?.name || 'Peoples Management Assistant'}</span><div><button onClick={a.reset} title="New conversation" disabled={a.busy}><Plus size={17} /></button><button onClick={() => setExpanded(!expanded)} title={expanded ? 'Reduce panel' : 'Expand panel'}>{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button><button onClick={() => a.setOpen(false)} title="Minimize assistant"><X size={19} /></button></div></header><div className="hrbot-quickbar"><button onClick={() => goToAssistantLink('/assistant')}>All available actions →</button></div><Conversation /></> : <button className="hrbot-launcher" onClick={() => a.setOpen(true)} title="Open HR Assistant (drag to move)"><Bot size={26} /><span>Assistant{a.updates.length ? ` (${a.updates.length} new)` : ''}</span></button>}</motion.div></div>;
}
export function AssistantPage() {
  const a = useAssistant(); const [search, setSearch] = useState(''); const [showPassword, setShowPassword] = useState(window.location.hash === '#password');
  useEffect(() => { const handler = () => setShowPassword(window.location.hash === '#password'); window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler); }, []);
  const list = (a.capabilities?.tools || []).filter((t: Capability) => t.id !== 'studio.configure' && `${t.label} ${t.description}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="hrbot hrbot-page"><div className="hrbot-page-heading"><div><h1>{a.capabilities?.name || 'Employee Assistant'}</h1><p>English commands connected to your Peoples Management workspace.</p></div><div className="hrbot-links"><button onClick={() => void a.refresh()} disabled={a.capabilitiesLoading}><RefreshCw size={16} /> {a.capabilitiesLoading ? 'Checking access…' : 'Refresh access'}</button><button onClick={a.reset} disabled={a.busy}>New conversation</button>{a.capabilities?.superAdmin && <button onClick={() => goToAssistantLink('/assistant-admin')}>Bot Studio</button>}</div></div>{a.capabilitiesError && !a.capabilities && <p role="alert">Assistant access could not be loaded after automatic retries. Check the backend, then refresh access.</p>}{showPassword && <PasswordForm />}<div className="hrbot-workspace"><aside><label className="hrbot-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find an action…" /></label><p className="hrbot-muted">{a.capabilitiesLoading && !a.capabilities ? 'Loading permitted actions…' : `${list.length} currently permitted actions`}</p><div className="hrbot-capabilities">{list.map((t: Capability) => <button key={t.id} onClick={() => a.choose(t)} disabled={a.busy}><strong>{t.label}</strong><span>{t.description}</span><small>{t.risk === 'read' ? 'Read / navigate' : 'Confirmation required'}</small></button>)}</div></aside><section><Conversation /></section></div></div>;
}
function PasswordForm() {
  const [current, setCurrent] = useState(''); const [next, setNext] = useState(''); const [repeat, setRepeat] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); if (next !== repeat) { setMessage('New passwords do not match.'); return; } setBusy(true); setMessage(''); try { await api.post('/api/auth/change-password', { currentPassword: current, newPassword: next }); setCurrent(''); setNext(''); setRepeat(''); setMessage('Password changed. This form does not save passwords in chat.'); } catch (e: any) { setMessage(e.response?.data?.message || 'Unable to change password.'); } finally { setBusy(false); } }
  return <form className="hrbot-form hrbot-password" onSubmit={submit}><h2>Secure password change</h2><p>Sent directly to Peoples Management authentication, never to conversation history.</p><label>Current password<input type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} /></label><label>New password<input type="password" autoComplete="new-password" required minLength={3} maxLength={72} value={next} onChange={e => setNext(e.target.value)} /></label><label>Confirm new password<input type="password" autoComplete="new-password" required value={repeat} onChange={e => setRepeat(e.target.value)} /></label>{message && <p role="status">{message}</p>}<button className="hrbot-primary" disabled={busy}>Save password</button></form>;
}
export function ExtensionToolbar({ page }: { page: string }) {
  const a = useAssistant(); const [buttons, setButtons] = useState<any[]>([]);
  useEffect(() => { let live = true; const load = () => api.get('/api/assistant/extensions', { params: { page } }).then(r => { if (live) setButtons(r.data.data); }).catch(() => { if (live) setButtons([]); }); void load(); window.addEventListener('assistant-updated', load); return () => { live = false; window.removeEventListener('assistant-updated', load); }; }, [page, a.capabilities]);
  if (!buttons.length) return null;
  return <div className="hrbot hrbot-extension-bar"><small>Workspace actions</small>{buttons.map(b => <button key={b.id} disabled={a.busy} onClick={() => void a.invoke(b.action, b.arguments)}>{b.label}</button>)}</div>;
}
export function CustomEmployeeFields({ employeeId }: { employeeId: string }) {
  const a = useAssistant(); const [data, setData] = useState<any>({ fields: [] }); const [error, setError] = useState('');
  useEffect(() => { let live = true; const load = () => api.get(`/api/assistant/employees/${employeeId}/fields`).then(r => { if (live) { setData(r.data.data); setError(''); } }).catch(() => { if (live) setError('Unable to load custom fields.'); }); void load(); window.addEventListener('assistant-updated', load); return () => { live = false; window.removeEventListener('assistant-updated', load); }; }, [employeeId]);
  if (error) return <p className="text-sm text-slate-500 mt-6">{error}</p>;
  if (!data.fields.length) return null;
  return <section className="hrbot hrbot-custom-fields"><h2>Additional employee information</h2>{data.fields.map((f: any) => <div key={f.id}><label>{f.label}<input disabled={!data.canEdit} type={f.type === 'Number' ? 'number' : f.type === 'Date' ? 'date' : 'text'} value={f.value} onChange={e => setData((d: any) => ({ ...d, fields: d.fields.map((x: any) => x.id === f.id ? { ...x, value: e.target.value } : x) }))} /></label>{data.canEdit && <button disabled={a.busy} onClick={() => void a.invoke('employee.customField', { employee: employeeId, fieldId: f.id, value: String(f.value) })}>Preview save</button>}</div>)}</section>;
}
