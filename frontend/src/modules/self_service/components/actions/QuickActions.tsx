import React from 'react';
import { Settings, Calendar, Clock, User, Upload, CreditCard, FileText } from 'lucide-react';

export default function QuickActions({ onNavigate }: { onNavigate?: (tabId: any) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Settings size={20} className="text-blue-500" /> Quick Actions
      </h2>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => onNavigate && onNavigate('leave')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Calendar size={16} /></div>
            <span className="font-medium text-slate-700">Apply Leave</span>
          </div>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('attendance')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><Clock size={16} /></div>
            <span className="font-medium text-slate-700">View Attendance</span>
          </div>
        </button>
        <button 
          onClick={() => { window.history.replaceState({},'',`${window.location.pathname}#profile`); onNavigate?.('profile'); }}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><User size={16} /></div>
            <span className="font-medium text-slate-700">Update Profile</span>
          </div>
        </button>
        <button 
          onClick={() => { window.history.replaceState({},'',`${window.location.pathname}?profileSection=documents#profile`); onNavigate?.('profile'); }}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Upload size={16} /></div>
            <span className="font-medium text-slate-700">Upload Document</span>
          </div>
        </button>
        <button 
          onClick={() => alert('Payslips have not been published in this system. Contact HR for your payslip.')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><CreditCard size={16} /></div>
            <span className="font-medium text-slate-700">View Payslip</span>
          </div>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('profile')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center"><FileText size={16} /></div>
            <span className="font-medium text-slate-700">Submit Request</span>
          </div>
        </button>
      </div>
    </div>
  );
}
