import { useCallback, useEffect, useRef, useState } from 'react';
import { performanceApi as api } from '../api/performanceApi';
import type { Review, RunAction, Workspace } from '../types';

const messageFor = (error: unknown) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error instanceof Error ? error.message : 'Could not complete the request.');
export function usePerformance() {
  const [data, setData] = useState<Workspace | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const latestReview = useRef<Review | null>(null);
  const selection = useRef(''); const requestNumber = useRef(0); const busyRef = useRef(false);
  const [loading, setLoading] = useState(true); const [reviewLoading, setReviewLoading] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => { const fresh = await api.workspace(); setData(fresh); return fresh; }, []);
  useEffect(() => { let active = true; api.workspace().then(d => { if (active) setData(d); }).catch(e => { if (active) setError(messageFor(e)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  // Refresh lists/notifications on return to the window; never discard an open draft.
  useEffect(() => { const onFocus = () => { if (!busyRef.current) refresh().catch(() => undefined); }; window.addEventListener('focus', onFocus); return () => window.removeEventListener('focus', onFocus); }, [refresh]);
  const selectReview = useCallback(async (id: string) => {
    selection.current = id; const request = ++requestNumber.current;
    setReview(null); latestReview.current = null; setError('');
    if (!id) { setReviewLoading(false); return; }
    setReviewLoading(true);
    try { const fresh = await api.review(id); if (request === requestNumber.current) { latestReview.current = fresh; setReview(fresh); } }
    catch (e) { if (request === requestNumber.current) setError(messageFor(e)); }
    finally { if (request === requestNumber.current) setReviewLoading(false); }
  }, []);
  const run: RunAction = useCallback(async (operation, message) => {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await operation();
      await refresh();
      if (selection.current) {
        const id = selection.current; const fresh = await api.review(id);
        if (selection.current === id) {
          const changed = latestReview.current?.version !== fresh.version;
          latestReview.current = fresh;
          if (changed) setReview(fresh);
        }
      }
      setNotice(message); return true;
    } catch (e) { setError(messageFor(e)); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }, [refresh]);
  const action = useCallback(async (name: string, payload?: unknown) => {
    const current = latestReview.current;
    if (!current) return false;
    return run(() => api.action(current.id, current.version, name, payload), name === 'remind' ? 'In-app reminder sent.' : 'Review updated and saved.');
  }, [run]);
  return { data, review, loading, reviewLoading, busy, error, notice, run, action, selectReview, refresh, clearMessages: () => { setError(''); setNotice(''); } };
}
