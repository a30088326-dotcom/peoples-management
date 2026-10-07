import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { usersApi } from '../../../lib/api';
import type { TeamMember } from '../../../types';

interface EditMemberModalProps {
  member: TeamMember;
  onClose: () => void;
  onSuccess: () => void;
}

import { createPortal } from 'react-dom';

export default function EditMemberModal({ member, onClose, onSuccess }: EditMemberModalProps) {
  const [name, setName] = useState(member.name || '');
  const [email, setEmail] = useState(member.email || '');
  const [role, setRole] = useState(member.role);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const data: any = { name, email, role };
      if (newPassword) {
        if (newPassword.length < 6 || newPassword.length > 72) {
          throw new Error('Password must be 6–72 characters.');
        }
        data.newPassword = newPassword;
      }

      const response = await usersApi.update(member.id, data);
      onSuccess();
      if (!newPassword) {
        onClose();
      } else if (response.data.delivery?.sent) {
        setNewPassword('');
        setNotice(`Employee saved. Login email and temporary password were sent to ${response.data.recipient || email}.`);
      } else {
        setError(`Employee and password were saved, but the email was not sent. ${response.data.delivery?.reason || 'Check the mail configuration and try again.'} You can click Save Changes again to retry.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Edit Employee</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          )}
          {notice && <div role="status" className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200">{notice}</div>}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              <option value="ADMIN">Admin</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="CANDIDATE">Candidate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">New Password (Optional)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              autoComplete="new-password"
              minLength={6}
              maxLength={72}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            <p className="mt-2 text-xs text-slate-500">When you save a new password, the login email and temporary password are automatically emailed to this address. The employee must change it at first sign-in.</p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
