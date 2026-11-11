import { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import { leavesApi } from '../../../lib/api/leaves';
import RequestTimeOffModal, { type LeaveRequestOptions } from '../../leave_management/components/modals/RequestTimeOffModal';
import { RequestDetailsModal } from '../components/RequestDetailsModal';

export default function MyLeave({ employee, loading: empLoading }: { employee?: any, loading: boolean }) {
  const [activeTab, setActiveTab] = useState<'balances' | 'history'>('balances');
  
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingRequest, setViewingRequest] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [actionError, setActionError] = useState('');
  const [requestError,setRequestError]=useState('');
  const [requestMessage,setRequestMessage]=useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);

  // Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [entitlements, setEntitlements] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entRes, appRes, typesRes] = await Promise.all([
        leavesApi.getEntitlements(),
        leavesApi.getApplications(),
        leavesApi.getTypes()
      ]);
      
      if (typesRes.data?.data) {
        setLeaveTypes(typesRes.data.data);
        if (typesRes.data.data.length > 0 && !selectedLeaveType) {
          setSelectedLeaveType(typesRes.data.data[0].id);
        }
      }

      if (entRes.data?.data) {
        setEntitlements(entRes.data.data);
        setBalances(entRes.data.data.map((e: any) => {
          // In the database, 'earnedDays' currently stores the total yearly limit (e.g. 14)
          // and 'totalDays' stores the actual accrued days (e.g. 4)
          const yearlyLimit = Number(e.earnedDays) > 0 ? Number(e.earnedDays) : Number(e.totalDays);
          const accruedDays = Number(e.totalDays) || 0;
          return {
            type: e.leaveType?.name || 'Unknown',
            entitlement: yearlyLimit,
            used: Number(e.usedDays) || 0,
            pending: Number(e.pendingDays) || 0,
            balance: accruedDays - Number(e.usedDays || 0) - Number(e.pendingDays || 0) + Number(e.carryForwardDays || 0)
          };
        }));
      }
      
      if (appRes.data?.data) {
        setLeaveHistory(appRes.data.data.map((a: any) => ({
          id: a.id,
          displayId: a.id.slice(0, 8).toUpperCase(),
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
          attachmentUrl:a.attachmentUrl,halfDayType:a.halfDayType,coveringEmployee:a.coveringEmployee,
          medCertSubmitted:a.medCertSubmitted,medCertRefNo:a.medCertRefNo,medCertIssuedDate:a.medCertIssuedDate
        })));
      }
    } catch (err) {
      console.error('Failed to fetch leave data', err);
      setActionError('Unable to load leave data. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (options:LeaveRequestOptions={halfDayType:'NONE'}) => {
    setRequestError('');setRequestMessage('');
    if (!selectedLeaveType || selectedDates.length === 0) return setRequestError('Please select a leave type and date.');
    setIsSubmitting(true);
    
    // Sort dates
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    
    // Format local dates manually to avoid timezone shift from toISOString
    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    const startDateStr = formatLocalDate(sortedDates[0]);
    const endDateStr = formatLocalDate(sortedDates[sortedDates.length - 1]);
    const totalDays = options.halfDayType!=='NONE'?0.5:sortedDates.length;
    const span = Math.round((Date.UTC(sortedDates.at(-1)!.getFullYear(),sortedDates.at(-1)!.getMonth(),sortedDates.at(-1)!.getDate()) - Date.UTC(sortedDates[0].getFullYear(),sortedDates[0].getMonth(),sortedDates[0].getDate())) / 86400000) + 1;
    if (span !== sortedDates.length) {
      setIsSubmitting(false);
      return setRequestError('Select consecutive dates for one request. Submit separate requests for non-consecutive dates.');
    }
    
    try {
      await leavesApi.apply({
        leaveTypeId: selectedLeaveType,
        startDate: startDateStr,
        endDate: endDateStr,
        totalDays,
        reason: reason.trim() || undefined,
        ...options,
        comments: reason,
      });
      setRequestMessage('Leave request saved and sent to your reporting manager.');
      setShowRequestModal(false);
      setReason('');
      setSelectedDates([]);
      fetchData(); // Refresh data
    } catch (err: any) {
      setRequestError(err.response?.data?.message || 'Failed to apply leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEntitlement = entitlements.find(e => e.leaveTypeId === selectedLeaveType || e.leaveType?.id === selectedLeaveType);
  const projectedDeduction = selectedDates.length;

  const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  if (empLoading || loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-24 bg-slate-100 rounded-2xl"></div>
      <div className="h-96 bg-slate-100 rounded-2xl"></div>
    </div>;
  }

  const isMale = (employee?.personalDetails?.gender || employee?.gender)?.toLowerCase() === 'male';
  const visibleHistory = leaveHistory.filter(request =>
    (!pendingOnly || request.status?.startsWith('PENDING')) &&
    (!search.trim() || `${request.id} ${request.type}`.toLowerCase().includes(search.trim().toLowerCase())));
  const cancelRequest = async (request: any) => {
    setCancellingId(request.id); setActionError('');
    try {
      await leavesApi.cancel(request.id, 'Cancelled by employee');
      setCancelTarget(null);
      await fetchData();
    } catch (error: any) {
      setActionError(error.response?.data?.message || 'Unable to cancel this request. Please try again.');
    } finally { setCancellingId(null); }
  };
  const displayBalances = balances.filter(b => {
    if (isMale && b.type.toLowerCase().includes('maternity')) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-24">
      {actionError && <p role="alert" className="p-4 rounded-xl bg-red-50 text-red-700">{actionError}</p>}
      {requestMessage && <p role="status" className="p-4 rounded-xl bg-green-50 text-green-700">{requestMessage}</p>}
      
      {/* Header & Apply Action */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Leave</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your leave entitlements, applications, and history.</p>
        </div>
        <button onClick={() => {setRequestError('');setShowRequestModal(true);}} className="btn-primary gap-2 whitespace-nowrap">
          <Plus size={18} /> Apply Leave
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button 
            onClick={() => setActiveTab('balances')}
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'balances' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Leave Balances
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Leave History
          </button>
        </div>

        {activeTab === 'balances' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Entitlement</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Used</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Pending</th>
                    <th className="p-4 text-xs font-bold text-slate-800 uppercase tracking-wider text-center bg-blue-50/50">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayBalances.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No balances found. Debug info: entitlements length = {entitlements.length}. 
                        Data: {JSON.stringify(entitlements.map(e => e.leaveType?.name))}
                      </td>
                    </tr>
                  )}
                  {displayBalances.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" /> {b.type}
                      </td>
                      <td className="p-4 text-center text-slate-600 font-medium">{b.entitlement}</td>
                      <td className="p-4 text-center text-slate-600 font-medium">{b.used}</td>
                      <td className="p-4 text-center text-amber-600 font-medium">{b.pending}</td>
                      <td className="p-4 text-center text-blue-700 font-black text-lg bg-blue-50/30">{b.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by ID or type..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
              <button onClick={() => setPendingOnly(value => !value)} aria-pressed={pendingOnly} className="btn-secondary gap-2 text-sm bg-white border border-slate-200">
                <Filter size={14} /> {pendingOnly ? 'Show all requests' : 'Pending only'}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Request ID</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Days</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleHistory.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs">{req.displayId}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{req.type}</td>
                      <td className="p-4 text-sm text-slate-600 font-medium">
                        {req.from === req.to ? formatDate(req.from) : `${formatDate(req.from)} to ${formatDate(req.to)}`}
                      </td>
                      <td className="p-4 text-slate-800 font-bold">{req.days}</td>
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
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setViewingRequest(req)} className="app-action text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                            View
                          </button>
                          {(req.status?.startsWith('PENDING') || req.status === 'APPROVED') && (
                            <button disabled={cancellingId === req.id} onClick={() => { setActionError(''); setCancelTarget(req); }} className="app-action text-sm font-bold text-rose-600 hover:text-rose-800 transition-colors bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100">
                              {cancellingId === req.id ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleHistory.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">No matching leave requests.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <RequestDetailsModal request={viewingRequest} onClose={() => setViewingRequest(null)} />
      {cancelTarget && <div role="dialog" aria-modal="true" aria-label="Cancel leave request" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md space-y-4">
          <h2 className="text-xl font-bold">Cancel leave request?</h2>
          <p>{cancelTarget.type} · {formatDate(cancelTarget.from)} · {Number(cancelTarget.days)} day(s)</p>
          <p className="text-slate-600">The request history will be retained and the reserved or used leave will be returned to your balance.</p>
          {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
          <div className="flex justify-end gap-3">
            <button disabled={!!cancellingId} onClick={() => setCancelTarget(null)} className="btn-secondary">Keep request</button>
            <button disabled={!!cancellingId} onClick={() => cancelRequest(cancelTarget)} className="btn-primary">{cancellingId ? 'Cancelling…' : 'Confirm cancellation'}</button>
          </div>
        </div>
      </div>}
      <RequestTimeOffModal
        showRequestModal={showRequestModal}
        employeeId={employee?.id}
        error={requestError}
        setShowRequestModal={setShowRequestModal}
        selectedLeaveType={selectedLeaveType}
        setSelectedLeaveType={setSelectedLeaveType}
        selectedDates={selectedDates}
        setSelectedDates={setSelectedDates}
        reason={reason}
        setReason={setReason}
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
        leaveTypes={leaveTypes}
        selectedEntitlement={selectedEntitlement}
        projectedDeduction={projectedDeduction}
        leaveHistory={leaveHistory}
      />
    </div>
  );
}
