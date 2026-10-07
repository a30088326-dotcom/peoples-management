import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface RequestTimeOffModalProps {
  showRequestModal: boolean;
  setShowRequestModal: (show: boolean) => void;
  selectedLeaveType: string;
  setSelectedLeaveType: (type: string) => void;
  selectedDates: Date[];
  setSelectedDates: (dates: Date[]) => void;
  reason: string;
  setReason: (reason: string) => void;
  isSubmitting: boolean;
  handleSubmit: () => void;
  leaveTypes: any[];
  selectedEntitlement: any;
  projectedDeduction: number;
  leaveHistory?: any[];
}

export default function RequestTimeOffModal({
  showRequestModal,
  setShowRequestModal,
  selectedLeaveType,
  setSelectedLeaveType,
  selectedDates,
  setSelectedDates,
  reason,
  setReason,
  isSubmitting,
  handleSubmit,
  leaveTypes,
  selectedEntitlement,
  projectedDeduction,
  leaveHistory
}: RequestTimeOffModalProps) {

  // Helper to get all dates between a start and end date
  const getDatesBetween = (start: string, end: string) => {
    const dates = [];
    let currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const pendingDates = leaveHistory?.filter(r => r.status.includes('PENDING')).flatMap(r => getDatesBetween(r.startDate, r.endDate)) || [];
  const approvedDates = leaveHistory?.filter(r => r.status === 'APPROVED').flatMap(r => getDatesBetween(r.startDate, r.endDate)) || [];

  const handleClose = () => {
    setShowRequestModal(false);
    setSelectedDates([]);
    setReason('');
  };

  const currentBalance = selectedEntitlement ? Math.round(
    (Number(selectedEntitlement.totalDays) || 0)
    - Number(selectedEntitlement.usedDays || 0) 
    - Number(selectedEntitlement.pendingDays || 0) 
    + Number(selectedEntitlement.carryForwardDays || 0)
  ) : 0;

  return (
    <AnimatePresence>
      {showRequestModal && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Request Time Off</h2>
              <button 
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex">
              {/* Form Section */}
              <div className="flex-1 p-8 space-y-6">
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leave Type</label>
                  <select 
                    value={selectedLeaveType}
                    onChange={(e) => setSelectedLeaveType(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="" disabled>Select a Leave Type...</option>
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 flex flex-col items-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider self-start mb-2">Select Date Range</label>
                  <DayPicker
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates: Date[] | undefined) => {
                      setSelectedDates(dates || []);
                    }}
                    disabled={[
                      ...pendingDates,
                      ...approvedDates,
                      { before: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(0, 0, 0, 0)) }
                    ]}
                    modifiers={{
                      pending: pendingDates,
                      approvedFuture: approvedDates.filter(d => d >= new Date(new Date().setHours(0, 0, 0, 0))),
                      approvedPast: approvedDates.filter(d => d < new Date(new Date().setHours(0, 0, 0, 0))),
                    }}
                    modifiersClassNames={{
                      pending: 'rdp-day_pending',
                      approvedFuture: 'rdp-day_approved_future',
                      approvedPast: 'rdp-day_approved_past',
                    }}
                    className="border-0 bg-transparent custom-calendar"
                  />
                  <style>{`
                    .custom-calendar .rdp-day_selected,
                    .custom-calendar .rdp-day_selected:focus-visible,
                    .custom-calendar .rdp-day_selected:hover {
                      background-color: #dc2626 !important;
                      color: white !important;
                    }

                    /* Pending Modifier (Red) */
                    .custom-calendar .rdp-day_pending {
                      background-color: #ef4444 !important;
                      color: white !important;
                      opacity: 1 !important;
                    }

                    /* Future Approved Modifier (Solid Green) */
                    .custom-calendar .rdp-day_approved_future {
                      background-color: #10b981 !important;
                      color: white !important;
                      opacity: 1 !important;
                    }

                    /* Past Approved Modifier (Light Green) */
                    .custom-calendar .rdp-day_approved_past {
                      background-color: #d1fae5 !important;
                      color: #065f46 !important;
                      opacity: 1 !important;
                    }

                    /* Ensure disabled dates don't hide our custom backgrounds */
                    .custom-calendar .rdp-day_disabled.rdp-day_pending,
                    .custom-calendar .rdp-day_disabled.rdp-day_approved_future {
                      opacity: 1 !important;
                      cursor: not-allowed !important;
                    }
                    
                    .custom-calendar .rdp-day_disabled.rdp-day_approved_past {
                      opacity: 0.8 !important;
                      cursor: not-allowed !important;
                    }
                  `}</style>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason</label>
                  <textarea 
                    rows={4} 
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                    placeholder="Please provide a brief reason for your request..."
                  />
                </div>

                <div className="pt-6">
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !selectedLeaveType || selectedDates.length === 0}
                    className="w-full btn-primary py-4 text-base shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={20} />
                    {isSubmitting ? 'Submitting...' : `Submit Request (${selectedDates.length} ${selectedDates.length === 1 ? 'day' : 'days'})`}
                  </button>
                </div>
              </div>

              {/* Balance Summary Panel */}
              <div className="w-64 bg-slate-50 border-l border-slate-100 p-6 flex flex-col">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Info size={14} className="text-blue-500" />
                  Balance Impact
                </h4>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Current Balance</p>
                    <p className="text-2xl font-black text-slate-800">
                      {currentBalance} <span className="text-sm font-bold text-slate-400"> Days</span>
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <p className="text-slate-500 text-sm font-medium mb-1">Requested</p>
                    <p className="text-2xl font-black text-amber-500">
                      - {projectedDeduction} <span className="text-sm font-bold text-amber-400">Days</span>
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <p className="text-slate-500 text-sm font-medium mb-1">Projected Balance</p>
                    <p className="text-3xl font-black text-blue-600">
                      {currentBalance - projectedDeduction} <span className="text-sm font-bold text-blue-400"> Days</span>
                    </p>
                  </div>
                </div>

                <div className="mt-auto bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                  <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-blue-800">This request will deduct {projectedDeduction} days from your {selectedEntitlement?.leaveType?.name || 'allowance'}.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
