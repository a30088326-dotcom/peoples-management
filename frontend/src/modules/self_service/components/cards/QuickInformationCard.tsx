import { Activity } from 'lucide-react';

export default function QuickInformationCard({ 
  statsLoading, stats, displayData, calculateYearsOfService 
}: { 
  statsLoading: boolean, stats: any, displayData: any, calculateYearsOfService: (d: string) => string 
}) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Activity size={20} className="text-blue-500" /> Quick Information
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Leave Balance</p>
          <p className="text-2xl font-black text-slate-800">{statsLoading ? '-' : stats.leaveBalance} <span className="text-sm font-medium text-slate-500">days</span></p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Requests</p>
          <p className="text-2xl font-black text-amber-500">{statsLoading ? '-' : stats.pendingRequests}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Years of Service</p>
          <p className="text-2xl font-black text-slate-800">{calculateYearsOfService(displayData.dateJoined)} <span className="text-sm font-medium text-slate-500">yrs</span></p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Attendance Today</p>
          <p className="text-sm font-bold text-green-600">{statsLoading ? '-' : stats.attendanceToday}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Latest Payslip</p>
          <p className="text-sm font-bold text-slate-800">Not Available</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Reporting To</p>
          <p className="text-sm font-bold text-slate-800">{displayData.reportingManager}</p>
        </div>
      </div>
    </div>
  );
}
