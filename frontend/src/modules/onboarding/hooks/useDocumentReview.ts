import { useEffect, useRef, useState } from 'react';
import { documentsApi } from '../../../lib/api/documents';
import type { VerificationDocument } from '../components/verification/documentPresentation';

const errorMessage = (error: any, fallback: string) => error?.response?.data?.message || error?.message || fallback;

async function verifyDocument(id: string, status: 'APPROVED' | 'REJECTED', rejectionNote?: string) {
  const { data: result } = await documentsApi.verify(id, status, rejectionNote);
  if (!result.success || result.data?.id !== id || result.data.status !== status) {
    throw new Error(result.message || 'The document could not be updated.');
  }
  return result;
}

export function useDocumentReview({ document, candidateId, onUpdated, onRefreshed }: {
  document: VerificationDocument | null;
  candidateId: string;
  onUpdated: (document: VerificationDocument) => void;
  onRefreshed: (documents: VerificationDocument[]) => void;
}) {
  const [action, setAction] = useState<'review' | 'approve-all' | null>(null);
  const busy = action !== null;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [refreshRequired, setRefreshRequired] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  const current = useRef('');
  current.current = `${candidateId}:${document?.id || ''}`;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const reset = () => {
    setError(''); setNotice(''); setRejectOpen(false); setRejectionNote(''); setRefreshRequired(false);
  };
  const requirePending = () => {
    if (!document) return false;
    if (document.status !== 'PENDING') {
      setError('This document was already reviewed. Only pending submissions can be approved or rejected.');
      setRejectOpen(false);
      return false;
    }
    return !refreshRequired;
  };
  const openReject = () => {
    if (locked.current || !requirePending()) return;
    setError(''); setNotice(''); setRejectionNote(''); setRejectOpen(true);
  };
  const closeReject = () => { if (!locked.current) { setRejectOpen(false); setRejectionNote(''); setError(''); } };

  const readLatest = async (key: string) => {
    const response = await documentsApi.list(candidateId);
    if (!mounted.current || current.current !== key) return;
    const latest: VerificationDocument[] = response.data.data;
    if (!Array.isArray(latest)) throw new Error('Unable to read the latest document list.');
    onRefreshed(latest);
    setRefreshRequired(false);
    if (!latest.find(item => item.id === document?.id && item.status === 'PENDING')) setRejectOpen(false);
  };
  const refresh = async () => {
    if (locked.current || !candidateId) return;
    locked.current = true; setAction('review');
    const key = current.current;
    try {
      await readLatest(key);
      if (mounted.current && current.current === key) { setError(''); setNotice('Document list refreshed.'); }
    } catch (failure) {
      if (mounted.current && current.current === key) setError(errorMessage(failure, 'Unable to refresh documents. Try again.'));
    } finally {
      locked.current = false;
      if (mounted.current) setAction(null);
    }
  };

  const decide = async (status: 'APPROVED' | 'REJECTED') => {
    if (locked.current || !requirePending() || !document) return;
    if (status === 'REJECTED' && !rejectionNote.trim()) { setError('Enter a reason for rejecting this document.'); return; }
    const key = current.current;
    locked.current = true; setAction('review'); setError(''); setNotice('');
    try {
      const result = await verifyDocument(document.id, status, status === 'REJECTED' ? rejectionNote.trim() : undefined);
      if (!mounted.current || current.current !== key) return;
      onUpdated(result.data);
      setRejectOpen(false); setRejectionNote('');
      const delivery = result.delivery;
      setNotice(delivery?.sent === false ? `Document rejected. The email was not sent: ${delivery.reason || 'Use Send Re-upload Link to retry delivery.'}` : result.message || `Document ${status.toLowerCase()} successfully.`);
    } catch (failure: any) {
      if (!mounted.current || current.current !== key) return;
      const message = errorMessage(failure, 'Unable to update this document. Try again.');
      setError(message);
      if ([404, 409].includes(failure?.response?.status)) {
        setRefreshRequired(true);
        try { await readLatest(key); }
        catch { if (mounted.current && current.current === key) setError(message + ' The latest status could not be loaded. Refresh documents before retrying.'); }
      }
    } finally {
      locked.current = false;
      if (mounted.current) setAction(null);
    }
  };

  const approveAll = async (documents: VerificationDocument[]) => {
    if (locked.current || !candidateId || refreshRequired || rejectOpen) return;
    const pending = documents.filter(item => item.status === 'PENDING');
    if (!pending.length) return;

    const key = current.current;
    locked.current = true;
    setAction('approve-all');
    setError('');
    setNotice('');
    let approved = 0;
    try {
      for (const item of pending) {
        const result = await verifyDocument(item.id, 'APPROVED');
        if (!mounted.current || current.current !== key) return;
        onUpdated(result.data);
        approved++;
      }
      setNotice(approved === 1 ? '1 document approved.' : `${approved} documents approved.`);
    } catch (failure) {
      if (!mounted.current || current.current !== key) return;
      const message = `${approved} of ${pending.length} approvals confirmed. ${errorMessage(failure, 'Unable to finish approving documents.')}`;
      setError(message);
      setRefreshRequired(true);
      try {
        await readLatest(key);
      } catch {
        if (mounted.current && current.current === key) setError(message + ' Refresh documents before retrying.');
      }
    } finally {
      locked.current = false;
      if (mounted.current) setAction(null);
    }
  };

  const sendReuploadLink = async () => {
    if (locked.current || !document || document.status !== 'REJECTED') return;
    const key = current.current;
    locked.current = true; setAction('review'); setError(''); setNotice('');
    try {
      const response = await documentsApi.sendReuploadLink(document.id);
      if (!mounted.current || current.current !== key) return;
      const delivery = response.data.data?.delivery;
      if (!response.data.success || delivery?.sent === false) throw new Error(delivery?.reason || response.data.message || 'The upload link was not sent.');
      setNotice(response.data.message || 'Upload link sent successfully.');
    } catch (failure) {
      if (mounted.current && current.current === key) setError(errorMessage(failure, 'Unable to send the upload link. Try again.'));
    } finally {
      locked.current = false;
      if (mounted.current) setAction(null);
    }
  };

  return { busy, approvingAll: action === 'approve-all', approveAll, error, notice, rejectOpen, rejectionNote, setRejectionNote, refreshRequired,
    reset, openReject, closeReject, refresh, approve: () => decide('APPROVED'), reject: () => decide('REJECTED'), sendReuploadLink };
}
