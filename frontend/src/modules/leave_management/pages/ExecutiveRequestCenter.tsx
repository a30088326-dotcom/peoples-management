import React, { useState, useEffect } from 'react';
import WorkspaceScrollArea from '../../../components/WorkspaceScrollArea';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User,
  Search,
  Filter,
  FileText,
  X
} from 'lucide-react';
import { leavesApi } from '../../../lib/api/leaves';
import { RequestDetailsModal } from '../../self_service/components/RequestDetailsModal';
import ApprovalModal from '../components/modals/ApprovalModal';
import TeamMonthlyCalendar from '../components/cards/TeamMonthlyCalendar';

export default function ExecutiveRequestCenter() {
  const [activeView, setActiveView] = useState<'leaves' | 'attendance'>('leaves');
  const [activeTab, setActiveTab] = useState<'all' | 'pendingForMe'>('all');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  
  const [viewingRequest, setViewingRequest] = useState<any | null>(null);
  
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await leavesApi.getCeoApplications({
        pendingForMe: activeTab === 'pendingForMe',
      });
      if (res.data?.data) {
        setRequests(res.data.data.map((a: any) => ({
          ...a,
          displayId: a.id.slice(0, 8).toUpperCase(),
        })));
      }
    } catch (err) {
      console.error('Failed to fetch CEO applications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const handleAction = async (id: string, action: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      await leavesApi.approveApplication(id, {
        action,
        rejectedReason: action === 'REJECTED' ? reason : undefined
      });
      setActionModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Action failed', error);
      setActionError('Failed to process action. You may not be authorized.');
    }
  };

  const openActionModal = (req: any) => {
    setSelectedRequest(req);
    setActionModalOpen(true);
  };

  return (
    <div className="workspace-frame p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto gap-6">
      
      {/* Header */}
      <div className="shrink-0 bg-slate-900 rounded-2xl shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-300 via-transparent to-transparent"></div>
        <div className="p-8 sm:p-10 relative z-10 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-white ring-1 ring-white/20 shadow-inner">
              <Briefcase size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Executive Request Center</h1>
              <p className="text-slate-300 mt-1">Organization-wide view and final approvals</p>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveView('leaves')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeView === 'leaves'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Leave Requests
        </button>

        <button
          onClick={() => setActiveView('attendance')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeView === 'attendance'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Organization Attendance
        </button>
      </div>

      <WorkspaceScrollArea resetKey={`${activeView}:${activeTab}`} label="Executive request content">
      {activeView === 'leaves' ? (
        <>
          {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pendingForMe')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'pendingForMe'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Final Approvals (Action Required)
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'all'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          All Organizational Requests
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">All caught up!</h3>
            <p className="text-slate-500 mt-1">No requests require your attention at the moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Leave dates</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requested on</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <User size={18} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{req.applicantName || req.applicantId}</p>
                          <p className="text-xs font-mono text-slate-500">ID: {req.displayId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{req.leaveType?.name}</p>
                      <p className="text-xs text-slate-500">{req.totalDays} Days</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-slate-800">{new Date(req.startDate).toLocaleDateString()}</p>
                      <p className="text-sm font-medium text-slate-800">{new Date(req.endDate).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max ${
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                        req.status.includes('PENDING') ? 'bg-amber-100 text-amber-700' : 
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {req.status === 'APPROVED' ? <CheckCircle2 size={12} /> : req.status.includes('PENDING') ? <Clock size={12} /> : <XCircle size={12} />}
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
                        {activeTab === 'pendingForMe' && (
                          <button
                            onClick={() => openActionModal(req)}
                            className="text-sm font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        <TeamMonthlyCalendar scope="organization" />
      )}
      </WorkspaceScrollArea>

      {viewingRequest && (
        <RequestDetailsModal 
          request={viewingRequest} 
          onClose={() => setViewingRequest(null)} 
        />
      )}

      {actionModalOpen && selectedRequest && (
        <ApprovalModal
          application={selectedRequest}
          onClose={() => setActionModalOpen(false)}
          onAction={handleAction}
        />
      )}

      {/* ─── Inline Error Banner ─── */}
      {actionError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 bg-red-600 text-white rounded-2xl shadow-2xl max-w-lg">
          <XCircle size={18} className="shrink-0" />
          <span className="text-sm font-medium flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-white/70 hover:text-white ml-2"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
