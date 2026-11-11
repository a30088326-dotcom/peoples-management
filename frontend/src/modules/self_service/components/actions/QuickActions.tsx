import { Settings, Calendar, Clock, User, Upload, CreditCard, FileText } from 'lucide-react';

export default function QuickActions({ onNavigate }: { onNavigate?: (tabId: any) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Settings size={20} className="text-blue-500" /> Quick Actions
      </h2>
      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <button 
          onClick={() => onNavigate && onNavigate('leave')}
          className="app-action w-full"
        >
          <div className="flex items-center gap-3">
            <Calendar size={16} />
            <span className="font-medium text-slate-700">Apply Leave</span>
          </div>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('attendance')}
          className="app-action w-full"
        >
          <div className="flex items-center gap-3">
            <Clock size={16} />
            <span className="font-medium text-slate-700">View Attendance</span>
          </div>
        </button>
        <button 
          onClick={() => { window.history.replaceState({},'',`${window.location.pathname}#profile`); onNavigate?.('profile'); }}
          className="app-action w-full"
        >
          <div className="flex items-center gap-3">
            <User size={16} />
            <span className="font-medium text-slate-700">Update Profile</span>
          </div>
        </button>
        <button 
          onClick={() => { window.history.replaceState({},'',`${window.location.pathname}?profileSection=documents#profile`); onNavigate?.('profile'); }}
          className="app-action w-full"
        >
          <div className="flex items-center gap-3">
            <Upload size={16} />
            <span className="font-medium text-slate-700">Upload Document</span>
          </div>
        </button>
        <button 
          onClick={() => alert('Payslips have not been published in this system. Contact HR for your payslip.')}
          className="app-action w-full"
        >
          <div className="flex items-center gap-3">
            <CreditCard size={16} />
            <span className="font-medium text-slate-700">View Payslip</span>
          </div>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('profile')}
          className="app-action w-full"
        >
          <div className="flex items-center gap-3">
            <FileText size={16} />
            <span className="font-medium text-slate-700">Submit Request</span>
          </div>
        </button>
      </div>
    </div>
  );
}
