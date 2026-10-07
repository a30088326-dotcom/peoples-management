import { useState, type FormEvent } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api/client';
import { authApi } from '../../../lib/api/auth';

export default function ChangePassword() {
  const { user, token, setSession, logout } = useAuth();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (newPassword !== confirmation) { setError('New passwords do not match.'); return; }
    setBusy(true);
    try { await api.post('/api/auth/change-password', { currentPassword, newPassword });
      const response = await authApi.me(); setSession(response.data.user, token!);
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'Unable to change password.'); }
    finally { setBusy(false); }
  }
  return <main className="ambient-bg min-h-screen flex items-center justify-center p-6"><form onSubmit={submit} className="glass-panel bg-white p-8 rounded-3xl shadow-xl w-full max-w-md space-y-5">
    <h1 className="text-2xl font-bold text-slate-800">Secure your account</h1><p className="text-slate-600">Welcome, {user?.name}. Replace your temporary password before opening your HR workspace.</p>
    <label className="block">Temporary password<input className="mt-2 border rounded-xl p-3 w-full" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrent(e.target.value)}/></label>
    <label className="block">New password<input className="mt-2 border rounded-xl p-3 w-full" type="password" autoComplete="new-password" required minLength={3} maxLength={72} value={newPassword} onChange={e=>setNew(e.target.value)}/></label>
    <label className="block">Confirm new password<input className="mt-2 border rounded-xl p-3 w-full" type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
    <p className="text-xs text-slate-500">Use at least 3 characters.</p>{error && <p role="alert" className="text-red-600">{error}</p>}
    <button disabled={busy} className="bg-blue-600 text-white rounded-xl px-5 py-3 w-full disabled:opacity-50">{busy?'Saving…':'Save password'}</button>
    <button type="button" onClick={logout} className="text-slate-500 w-full">Sign out</button>
  </form></main>;
}
