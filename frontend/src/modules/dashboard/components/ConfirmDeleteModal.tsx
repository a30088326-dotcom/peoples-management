import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { usersApi, invitesApi } from '../../../lib/api';
import type { TeamMember, PendingInvite } from '../../../types';

interface ConfirmDeleteModalProps {
  member: TeamMember | PendingInvite;
  isInvite?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDeleteSuccess?: (id: string) => void;
}

export default function ConfirmDeleteModal({ member, isInvite, onClose, onSuccess, onDeleteSuccess }: ConfirmDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      if (isInvite) {
        await invitesApi.delete(member.id);
      } else {
        await usersApi.delete(member.id);
      }
      if (onDeleteSuccess) {
        onDeleteSuccess(member.id);
      } else {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
            <Trash2 size={20} /> Delete Employee
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <p className="text-slate-600">
            Are you sure you want to delete <strong>{member.name || member.email}</strong>? 
            This action will permanently remove their account, profile, and all associated documents. 
            This action cannot be undone.
          </p>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xl shadow-red-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
