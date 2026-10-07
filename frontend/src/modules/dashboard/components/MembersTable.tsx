import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit2, Trash2, Send, Loader2 } from 'lucide-react';
import type { TeamMember, PendingInvite } from '../../../types';
import EditMemberModal from './EditMemberModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

import { useAuth } from '../../../context/AuthContext';
import { invitesApi } from '../../../lib/api';

type TabId = 'active' | 'pending' | 'onboarding' | 'invites';

interface MembersTableProps {
  activeTab: TabId;
  activeMembers: TeamMember[];
  invites: PendingInvite[];
  searchQuery: string;
  onRefresh: () => void;
  onDeleteSuccess?: (id: string) => void;
}

export default function MembersTable({ activeTab, activeMembers, invites, searchQuery, onRefresh, onDeleteSuccess }: MembersTableProps) {
  const {isAdmin}=useAuth();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | PendingInvite | null>(null);
  const [isDeletingInvite, setIsDeletingInvite] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<{ text: string; sent: boolean } | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // Filter based on tab and search
  const filteredActive = activeMembers.filter(m => 
    ([m.name,m.email,m.designation,m.team].join(' ').toLowerCase().includes(searchQuery.trim().toLowerCase())) &&
    m.status === 'Active'
  );

  const filteredPending = activeMembers.filter(m => 
    ([m.name,m.email,m.designation,m.team].join(' ').toLowerCase().includes(searchQuery.trim().toLowerCase())) &&
    m.status === 'Pending'
  );

  const filteredOnboarding = activeMembers.filter(m => 
    ([m.name,m.email,m.designation,m.team].join(' ').toLowerCase().includes(searchQuery.trim().toLowerCase())) &&
    m.status === 'Onboarding'
  );

  const filteredInvites = invites.filter(i => 
    i.status.toUpperCase() === 'PENDING' && (i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const resendInvite = async (invite: PendingInvite) => {
    setResendingId(invite.id);
    setResendMessage(null);
    try {
      const response = await invitesApi.resend(invite.id);
      const delivery = response.data.data.delivery;
      setResendMessage({
        sent: delivery?.sent === true,
        text: delivery?.sent
          ? `Invitation email accepted for ${invite.email}.`
          : `Invite kept in the system, but no email was sent. ${delivery?.reason || 'Check the mail settings and try again.'}`,
      });
      onRefresh();
    } catch (error: any) {
      setResendMessage({ sent: false, text: error.response?.data?.message || 'Unable to resend this invitation.' });
    } finally {
      setResendingId(null);
      setMenuOpenId(null);
    }
  };

  const renderActiveMemberRow = (member: TeamMember) => (
    <tr key={member.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: member.avatarColor }}>
            {member.avatarInitials}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{member.name}</p>
            <p className="text-xs text-slate-500">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <p className="font-medium text-slate-700 text-sm">{member.designation || '—'}</p>
        <p className="text-xs text-slate-500">{member.team || '—'}</p>
      </td>
      <td className="py-4 px-6">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          member.role === 'Admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {member.role}
        </span>
      </td>
      <td className="py-4 px-6">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          member.status === 'Active' ? 'bg-emerald-100 text-emerald-600' :
          member.status === 'Pending' ? 'bg-blue-100 text-blue-600' :
          'bg-orange-100 text-orange-600'
        }`}>
          {member.status.toUpperCase()}
        </span>
      </td>
      <td className="py-4 px-6 text-right relative">
        <button 
          disabled={!isAdmin}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpenId(menuOpenId === member.id ? null : member.id);
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
        >
          <MoreHorizontal size={18} />
        </button>

        {menuOpenId === member.id && (
          <div 
            ref={menuRef}
            className="absolute right-8 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 z-10 overflow-hidden"
          >
            <div className="py-1">
              <button 
                onClick={() => { setEditingMember(member); setMenuOpenId(null); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Edit2 size={14} className="text-blue-500" /> Edit Employee
              </button>
              <button 
                onClick={() => { setDeletingMember(member); setIsDeletingInvite(false); setMenuOpenId(null); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete Employee
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );

  const renderInviteRow = (invite: PendingInvite) => (
    <tr key={invite.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-slate-300">
            {invite.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{invite.name}</p>
            <p className="text-xs text-slate-500">{invite.email}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <p className="font-medium text-slate-700 text-sm">{invite.designation || '—'}</p>
        <p className="text-xs text-slate-500">{invite.team || '—'}</p>
      </td>
      <td className="py-4 px-6">
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">
          {invite.role}
        </span>
      </td>
      <td className="py-4 px-6">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          invite.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
        }`}>
          {invite.status}
        </span>
      </td>
      <td className="py-4 px-6 text-right relative">
        <button 
          disabled={!isAdmin}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpenId(menuOpenId === invite.id ? null : invite.id);
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
        >
          <MoreHorizontal size={18} />
        </button>

        {menuOpenId === invite.id && (
          <div 
            ref={menuRef}
            className="absolute right-8 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 z-10 overflow-hidden"
          >
            <div className="py-1">
              <button
                disabled={resendingId === invite.id}
                onClick={() => resendInvite(invite)}
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-60"
              >
                {resendingId === invite.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Resend Invite
              </button>
              <button 
                onClick={() => { setDeletingMember(invite); setIsDeletingInvite(true); setMenuOpenId(null); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete Invite
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );

  let content;
  if (activeTab === 'active') {
    content = filteredActive.map(renderActiveMemberRow);
  } else if (activeTab === 'pending') {
    content = filteredPending.map(renderActiveMemberRow);
  } else if (activeTab === 'onboarding') {
    content = filteredOnboarding.map(renderActiveMemberRow);
  } else if (activeTab === 'invites') {
    content = filteredInvites.map(renderInviteRow);
  }

  return (
    <>
      <div className="overflow-x-auto">
        {resendMessage && (
          <div role="status" className={`mx-6 mt-4 mb-2 rounded-xl border px-4 py-3 text-sm ${resendMessage.sent ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            {resendMessage.text}
          </div>
        )}
        <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50">
            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation & Team</th>
            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {content}
          {(!content || (Array.isArray(content) && content.length === 0)) && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                No records found.
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
      
      {editingMember && (
        <EditMemberModal 
          member={editingMember} 
          onClose={() => setEditingMember(null)}
          onSuccess={onRefresh}
        />
      )}

      {deletingMember && (
        <ConfirmDeleteModal 
          member={deletingMember} 
          isInvite={isDeletingInvite}
          onClose={() => setDeletingMember(null)} 
          onSuccess={onRefresh} 
          onDeleteSuccess={onDeleteSuccess}
        />
      )}
    </>
  );
}
