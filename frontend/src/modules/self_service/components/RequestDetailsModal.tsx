import React, { useEffect, useState } from 'react';
import { X, Clock, CheckCircle2, XCircle, User } from 'lucide-react';
import { leavesApi } from '../../../lib/api';
import { ProfileChangeDetails } from './TeamProfileRequests';

interface RequestDetailsModalProps {
  request: any | null;
  onClose: () => void;
}

export function RequestDetailsModal({ request, onClose }: RequestDetailsModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      if(request.type==='Profile Change'){
        setHistory([{id:'submitted',action:'SUBMITTED',created_at:request.createdAt,comment:request.description},...(request.approvedAt?[{id:'decided',action:request.status,created_at:request.approvedAt,comment:request.rejectionReason}]:[])]);setLoading(false);return;
      }
      if (request.type === 'Missed Attendance') {
        const correction = request.originalData || request;
        setHistory([
          { id: `submitted-${request.id}`, action: 'SUBMITTED', created_at: correction.createdAt, comment: correction.reason },
          ...(correction.resolvedAt ? [{ id: `resolved-${request.id}`, action: correction.status, created_at: correction.resolvedAt, comment: correction.resolutionNotes }] : [])
        ]);
        setLoading(false);
        return;
      }
      setLoading(true);
      leavesApi.getApplicationHistory(request.id)
        .then(res => setHistory(res.data.data || []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [request]);

  if (!request) return null;

  const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Request Details</h2>
          <button aria-label="Close request details" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {request.type==='Profile Change'?<div className="mb-8"><ProfileChangeDetails request={request}/></div>:<div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <p className="text-sm text-slate-500 font-medium">Request Type</p>
              <p className="font-bold text-slate-800">{request.type || request.leaveType?.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Status</p>
              <div className="flex flex-col gap-1 mt-1">
                <p className={`font-bold ${request.status === 'REJECTED' ? 'text-rose-600' : 'text-slate-800'}`}>
                  {request.status?.replace(/_/g, ' ')}
                </p>
                {request.status === 'REJECTED' && (
                  <p className="text-xs text-rose-700 bg-rose-50 px-2 py-1.5 rounded-md border border-rose-100">
                    <span className="font-semibold">Reason:</span> {request.rejectedReason || 'No reason provided'}
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Duration</p>
              <p className="font-bold text-slate-800">
                {(request.from || request.startDate) === (request.to || request.endDate) 
                  ? formatDate(request.from || request.startDate) 
                  : `${formatDate(request.from || request.startDate)} to ${formatDate(request.to || request.endDate)}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Days</p>
              <p className="font-bold text-slate-800">{request.days || request.totalDays}</p>
            </div>
            {request.createdAt && (
              <div>
                <p className="text-sm text-slate-500 font-medium">Requested On</p>
                <p className="font-bold text-slate-800">{new Date(request.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
            {(request.approverName || request.approver?.name) && (
              <div className="col-span-2">
                <p className="text-sm text-slate-500 font-medium">Current Approver</p>
                <p className="font-bold text-slate-800 flex items-center gap-2">
                  <User size={16} /> {request.approverName || request.approver?.name}
                </p>
              </div>
            )}
            {request.reason && (
              <div className="col-span-2">
                <p className="text-sm text-slate-500 font-medium">Reason</p>
                <p className="text-slate-800">{request.reason}</p>
              </div>
            )}
          </div>}

          <h3 className="text-lg font-bold text-slate-800 mb-4">Approval Timeline</h3>
          {loading ? (
            <p className="text-slate-500">Loading timeline...</p>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {history.length > 0 ? history.map((item, index) => (
                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {item.action === 'APPROVED' ? <CheckCircle2 size={18} className="text-emerald-500" /> : 
                     item.action === 'REJECTED' ? <XCircle size={18} className="text-rose-500" /> :
                     <Clock size={18} className="text-blue-500" />}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-800">{item.action}</h4>
                      <time className="text-xs font-medium text-slate-500">{new Date(item.created_at).toLocaleString()}</time>
                    </div>
                    {item.approver_name && <p className="text-sm text-slate-600 font-medium mb-1">By: {item.approver_name} (Level {item.level})</p>}
                    {item.comment && <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded mt-2">{item.comment}</p>}
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 text-center py-4">No timeline available yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
