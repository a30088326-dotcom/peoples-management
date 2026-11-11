import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useState,useEffect } from 'react';
import { api } from '../../../../lib/api/client';
import { eimsApi } from '../../../../lib/api/employee_information_audit';

export interface LeaveRequestOptions {
  halfDayType:'NONE'|'FIRST_HALF'|'SECOND_HALF';
  coveringEmployeeId?:string;
  attachmentUrl?:string;
  medCertSubmitted?:boolean;
  medCertRefNo?:string;
  medCertIssuedDate?:string;
}

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
  handleSubmit: (options?:LeaveRequestOptions) => void;
  employeeId?:string;
  error?:string;
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
  leaveHistory,
  employeeId,
  error
}: RequestTimeOffModalProps) {
  const [options,setOptions]=useState<LeaveRequestOptions>({halfDayType:'NONE'});
  const [covering,setCovering]=useState<{id:string;name:string;employeeNo?:string}[]>([]);
  const [validation,setValidation]=useState(''),[uploading,setUploading]=useState(false),[fileName,setFileName]=useState('');
  const selectedType=leaveTypes.find(type=>type.id===selectedLeaveType);
  const halfDay=Boolean(selectedType?.allowHalfDays)&&selectedDates.length===1?options.halfDayType:'NONE';
  const requestedDays=halfDay==='NONE'?projectedDeduction:0.5;
  const certificateRequired=Boolean(selectedType?.needMedicalCertificate)&&requestedDays>Number(selectedType.maxDaysWithoutMedCert||0);
  useEffect(()=>{setOptions({halfDayType:'NONE'});setValidation('');setFileName('');},[showRequestModal,selectedLeaveType]);
  useEffect(()=>{
    let active=true;
    if(showRequestModal&&selectedType?.requireCoveringEmp)api.get('/api/leaves/covering-employees').then(response=>{if(active)setCovering(response.data.data||[]);}).catch(()=>{if(active)setValidation('Unable to load covering employees. Close and reopen this form to retry.');});
    return()=>{active=false;};
  },[showRequestModal,selectedType?.requireCoveringEmp]);
  const uploadSupporting=async(file?:File)=>{
    if(!file)return;
    if(!employeeId){setValidation('Save your employee profile before uploading a document.');return;}
    if(file.size>10*1024*1024){setValidation('Each supporting document must be 10 MB or smaller.');return;}
    setUploading(true);setValidation('');
    try{const data=new FormData();data.append('files',file);const response=await eimsApi.uploadAttachments(employeeId,data);const saved=response.data.data?.[0];if(!saved?.fileUrl)throw new Error();setOptions(value=>({...value,attachmentUrl:saved.fileUrl,medCertSubmitted:Boolean(selectedType?.needMedicalCertificate)}));setFileName(file.name);}
    catch{setValidation('Unable to upload the supporting document. Please retry.');}finally{setUploading(false);}
  };
  const submit=()=>{
    setValidation('');
    if(selectedType?.commentMandatory&&!reason.trim())return setValidation('A reason is required for this leave type.');
    if(selectedType?.requireCoveringEmp&&!options.coveringEmployeeId)return setValidation('Select a covering employee.');
    if((selectedType?.requireAttachment||certificateRequired)&&!options.attachmentUrl)return setValidation(certificateRequired?'Upload your medical certificate.':'Upload a supporting document.');
    handleSubmit({...options,halfDayType:halfDay,medCertSubmitted:Boolean(certificateRequired&&options.attachmentUrl)});
  };

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

  const currentBalance = selectedEntitlement ? (
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
            role="dialog" aria-modal="true" aria-label="Request Time Off" className="leave-request-panel relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col"
          >
            <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Request Time Off</h2>
              <button 
                onClick={handleClose}
                aria-label="Close leave request"
                className="app-action w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors app-action-icon"
              >
                <X size={20} />
              </button>
            </div>

            <div className="leave-request-body min-h-0 flex-1 overflow-y-auto flex flex-col sm:flex-row">
              {/* Form Section */}
              <div className="min-w-0 flex-1 p-4 sm:p-8 space-y-6 order-2 sm:order-1">
                
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

                {Boolean(selectedType?.allowHalfDays)&&selectedDates.length===1&&<label className="block space-y-2 text-sm font-semibold text-slate-600">Leave duration
                  <select aria-label="Leave duration" value={halfDay} onChange={event=>setOptions(value=>({...value,halfDayType:event.target.value as LeaveRequestOptions['halfDayType']}))} className="input-field">
                    <option value="NONE">Full day</option><option value="FIRST_HALF">First half day</option><option value="SECOND_HALF">Second half day</option>
                  </select>
                </label>}

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

                {Boolean(selectedType?.requireCoveringEmp)&&<label className="block space-y-2 text-sm font-semibold text-slate-600">Covering employee
                  <select aria-label="Covering employee" value={options.coveringEmployeeId||''} onChange={event=>setOptions(value=>({...value,coveringEmployeeId:event.target.value}))} className="input-field"><option value="">Select a covering employee…</option>{covering.map(person=><option key={person.id} value={person.id}>{person.name}{person.employeeNo?' · '+person.employeeNo:''}</option>)}</select>
                </label>}
                {(Boolean(selectedType?.requireAttachment)||certificateRequired)&&<div className="space-y-3">
                  <label className="block space-y-2 text-sm font-semibold text-slate-600">{certificateRequired?'Medical certificate':'Supporting document'}
                    <input aria-label={certificateRequired?'Medical certificate':'Supporting document'} type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={uploading||isSubmitting} onChange={event=>void uploadSupporting(event.target.files?.[0])} className="block w-full text-sm"/>
                  </label>
                  {uploading&&<p role="status" className="text-sm text-blue-600">Uploading document…</p>}{fileName&&<p className="text-sm text-green-700">Attached: {fileName}</p>}
                  {certificateRequired&&<><label className="block text-sm text-slate-600">Certificate reference (optional)<input aria-label="Certificate reference" value={options.medCertRefNo||''} onChange={event=>setOptions(value=>({...value,medCertRefNo:event.target.value}))} className="input-field"/></label><label className="block text-sm text-slate-600">Certificate issue date (optional)<input aria-label="Certificate issue date" type="date" value={options.medCertIssuedDate||''} onChange={event=>setOptions(value=>({...value,medCertIssuedDate:event.target.value||undefined}))} className="input-field"/></label></>}
                </div>}
                {(validation||error)&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{validation||error}</p>}
                <div className="pt-6">
                  <button 
                    onClick={submit}
                    disabled={isSubmitting || uploading || !selectedLeaveType || selectedDates.length === 0}
                    className="w-full btn-primary py-4 text-base shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={20} />
                    {isSubmitting ? 'Submitting...' : `Submit Request (${requestedDays} ${requestedDays === 1 ? 'day' : 'days'})`}
                  </button>
                </div>
              </div>

              {/* Balance Summary Panel */}
              <div className="leave-balance-summary w-full sm:w-64 shrink-0 bg-slate-50 border-b sm:border-b-0 sm:border-l border-slate-100 p-4 sm:p-6 flex flex-col order-1 sm:order-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Info size={14} className="text-blue-500" />
                  Balance Impact
                </h4>
                
                <div className="grid grid-cols-3 gap-3 sm:block sm:space-y-6">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Current Balance</p>
                    <p className="text-2xl font-black text-slate-800">
                      {currentBalance} <span className="text-sm font-bold text-slate-400"> Days</span>
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <p className="text-slate-500 text-sm font-medium mb-1">Requested</p>
                    <p className="text-2xl font-black text-amber-500">
                      - {requestedDays} <span className="text-sm font-bold text-amber-400">Days</span>
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <p className="text-slate-500 text-sm font-medium mb-1">Projected Balance</p>
                    <p className="text-3xl font-black text-blue-600">
                      {currentBalance - requestedDays} <span className="text-sm font-bold text-blue-400"> Days</span>
                    </p>
                  </div>
                </div>

                <div className="mt-auto bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                  <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-blue-800">This request will deduct {requestedDays} days from your {selectedEntitlement?.leaveType?.name || 'allowance'}.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
