import React, { useState, useEffect } from 'react';
import { Info, Clock, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { leavesApi } from '../../../lib/api/leaves';
import { attendanceApi } from '../api/attendanceApi';
import { RequestDetailsModal } from '../components/RequestDetailsModal';
import { profileRequestApi } from '../components/ProfileRequestForm';
import TeamProfileRequests from '../components/TeamProfileRequests';

export default function MyRequests({ employee, loading: empLoading }: { employee: any, loading: boolean }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingRequest, setViewingRequest] = useState<any | null>(null);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [error,setError]=useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const [leavesRes, exceptionsRes, profileRes] = await Promise.all([
          leavesApi.getApplications().catch(() => ({ data: { data: [] } })),
          attendanceApi.getMyExceptions().catch(() => ({ data: { data: [] } })),
          profileRequestApi.my()
        ]);
        
        let allRequests: any[] = [];
        allRequests.push(...(profileRes.data.data||[]).map((r:any)=>({...r,type:'Profile Change',displayId:'PRF-'+r.id.slice(0,8).toUpperCase(),reason:r.description,originalData:r})));
        
        if (leavesRes.data?.data) {
          allRequests = [...allRequests, ...leavesRes.data.data.map((a: any) => ({
            id: a.id,
            displayId: 'LVE-' + a.id.slice(0, 8).toUpperCase(),
            type: a.leaveType?.name || 'Leave',
            from: a.startDate,
            to: a.endDate,
            days: a.totalDays,
            status: a.status,
            createdAt: a.createdAt,
            approverName: a.approver?.name || null,
            reason: a.reason,
            leaveType: a.leaveType,
            startDate: a.startDate,
            endDate: a.endDate,
            totalDays: a.totalDays,
            rejectedReason: a.rejectedReason,
            originalData: a
          }))];
        }

        if (exceptionsRes.data?.data) {
          allRequests = [...allRequests, ...exceptionsRes.data.data.map((e: any) => ({
            id: e.id,
            displayId: 'ATT-' + e.id.slice(0, 8).toUpperCase(),
            type: 'Missed Attendance',
            from: e.date,
            to: e.date,
            days: 1,
            status: e.status,
            createdAt: e.createdAt,
            approverName: null,
            reason: e.reason || e.exceptionType,
            leaveType: null,
            startDate: e.date,
            endDate: e.date,
            totalDays: 1,
            rejectedReason: e.resolutionNotes,
            originalData: e
          }))];
        }

        // Sort by createdAt descending
        allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(allRequests);
      } catch (err) {
        console.error('Failed to fetch requests', err);
        setError('Unable to load requests. Please reload and try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  if (empLoading || loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-24 bg-slate-100 rounded-2xl"></div>
      <div className="h-64 bg-slate-100 rounded-2xl"></div>
    </div>;
  }

  const visibleRequests = pendingOnly
    ? requests.filter(request => request.status?.includes('PENDING'))
    : requests;
  const pendingCount = requests.filter(request => request.status?.includes('PENDING')).length;
  const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Requests</h2>
          <p className="text-slate-500 text-sm mt-1">Track leave, attendance corrections and profile changes sent for approval.</p>
        </div>
        <button
          onClick={() => setPendingOnly(current => !current)}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${pendingOnly
            ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
        >
          Pending ({pendingCount})
        </button>
      </div>

      {visibleRequests.length === 0 ? (
        <div className="bg-slate-50 p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Info size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">No Requests Found</h3>
          <p className="text-slate-600 max-w-md">{pendingOnly ? 'There are no pending requests.' : "You haven't submitted any HR requests yet."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Request ID</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Request Type</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Request Date / Change</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requested On</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs">{req.displayId}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" /> {req.type}
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">
                      {req.type==='Profile Change'?<div className="capitalize">{req.title}</div>:<><div>{req.from === req.to ? formatDate(req.from) : `${formatDate(req.from)} to ${formatDate(req.to)}`}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{req.days} day{Number(req.days) !== 1 ? 's' : ''}</div></>}
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{formatDate(req.createdAt)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max ${
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : req.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' : 
                        req.status.includes('PENDING') ? 'bg-amber-100 text-amber-700' : 
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {req.status === 'APPROVED' ? <CheckCircle2 size={12} /> : req.status.includes('PENDING') ? <Clock size={12} /> : req.status === 'CANCELLED' ? <Info size={12} /> : <XCircle size={12} />}
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setViewingRequest(req)}
                          className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={async () => {
                            if (req.type === 'Missed Attendance') {
                              alert('Cannot delete missed attendance requests currently.');
                              return;
                            }
                            if (!req.status?.includes('PENDING')) {
                              alert('Only pending requests can be cancelled. Approved history is retained for audit.');
                              return;
                            }
                            if (window.confirm('Are you sure you want to cancel this request?')) {
                              try {
                                if(req.type==='Profile Change')await profileRequestApi.cancel(req.id);
                                else await leavesApi.cancel(req.id, 'Cancelled by employee');
                                setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'CANCELLED' } : r));
                              } catch (err) {
                                console.error('Failed to cancel request', err);
                                alert('Failed to cancel request');
                              }
                            }
                          }}
                          className={`text-sm font-bold transition-colors px-3 py-1.5 rounded-lg ${req.type === 'Missed Attendance' || !req.status?.includes('PENDING') ? 'text-slate-400 bg-slate-50 cursor-not-allowed' : 'text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100'}`}
                          disabled={req.type === 'Missed Attendance' || !req.status?.includes('PENDING')}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error&&<p role="alert" className="text-red-700">{error}</p>}
      <TeamProfileRequests/>
      {viewingRequest && (
        <RequestDetailsModal 
          request={viewingRequest} 
          onClose={() => setViewingRequest(null)} 
        />
      )}
    </div>
  );
}
