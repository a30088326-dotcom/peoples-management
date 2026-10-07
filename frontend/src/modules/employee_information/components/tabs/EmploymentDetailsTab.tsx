import React, { useState, useEffect } from 'react';
import { eimsApi } from '../../../../lib/api/employee_information_audit';
import { eimApi } from '../../../../lib/api/eimApi';
import { reportingHierarchyApi } from '../../../../lib/api/reportingHierarchy';
import { CheckCircle, AlertTriangle, Loader2, Award, Network, Calendar } from 'lucide-react';

interface ConfirmationResult {
  leaveGroupAssigned: string;
  entitlements: {
    leaveTypeName: string;
    leaveTypeCode: string;
    calculatedDays: number;
    alreadyGranted: number;
    alreadyUsed: number;
    netNewEntitlement: number;
  }[];
}

export default function EmploymentDetailsTab({ data, workstationData, update, updateWorkstation, employeeId }: { data: any, workstationData: any, update: (d: any) => void, updateWorkstation: (d: any) => void, employeeId?: string }) {
  const handleChange = (field: string, value: any) => {
    update({ [field]: value });
  };

  const handleWorkstationChange = (field: string, value: any) => {
    updateWorkstation({ [field]: value });
  };

  // Confirmation Dialog State
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDate, setConfirmDate] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [eligibleManagers, setEligibleManagers] = useState<any[]>([]);
  const [eimData, setEimData] = useState({
    companies: [] as any[], locations: [] as any[], departments: [] as any[],
    designations: [] as any[], salaryGrades: [] as any[], employmentTypes: [] as any[],
    functionalRoles: [] as any[], costCentres: [] as any[]
  });

  useEffect(() => {
    reportingHierarchyApi.getActiveEmployees('', employeeId)
      .then(res => {
        if (res.data && res.data.data && res.data.data.length > 0) {
          setEligibleManagers(res.data.data);
        } else {
          loadFallbackManagers();
        }
      })
      .catch(err => {
        console.error('Failed to load eligible managers', err);
        loadFallbackManagers();
      });


    const fetchEim = async () => {
      try {
        const [cRes, lRes, sRes, dRes, sgRes, etRes, frRes, ccRes] = await Promise.all([
          eimApi.getCompanies(), eimApi.getLocations(), eimApi.getStructures(),
          eimApi.getDesignations(), eimApi.getSalaryGrades(), eimApi.getEmploymentTypes(),
          eimApi.getFunctionalRoles(), eimApi.getCostCentres()
        ]);
        setEimData({
          companies: cRes.data?.data || [],
          locations: lRes.data?.data || [],
          departments: (sRes.data?.data || []).filter((s: any) => s.structureType === 'Department'),
          designations: dRes.data?.data || [],
          salaryGrades: sgRes.data?.data || [],
          employmentTypes: etRes.data?.data || [],
          functionalRoles: frRes.data?.data || [],
          costCentres: ccRes.data?.data || []
        });
      } catch (e) { console.error('EIM load error', e); }
    };
    fetchEim();
  }, [employeeId]);

  const loadFallbackManagers = () => {
    eimsApi.getEmployees()
      .then(res => {
        const list = (res.data.data || [])
          .filter((emp: any) => !employeeId || emp.id !== employeeId)
          .map((emp: any) => ({
            id: emp.id,
            employeeNo: emp.employeeNo,
            name: emp.callingName || (emp.personalDetails ? `${emp.personalDetails.firstName || ''} ${emp.personalDetails.lastName || ''}`.trim() : '') || emp.firstName || 'Employee',
            designation: emp.designation || (emp.workstationDetails?.Designation?.name) || 'Staff'
          }));
        setEligibleManagers(list);
      })
      .catch(e => console.error('Failed to load fallback managers', e));
  };

  const empTypeName = eimData.employmentTypes.find(t => t.id === data?.employmentTypeId)?.name || data?.employmentType;
  const isPermanent = empTypeName === 'Permanent';
  const isProbation = empTypeName === 'Probation';
  const isContract = empTypeName === 'Contract';
  const isAlreadyConfirmed = data?.probationStatus === 'Confirmed';

  const handleConfirmPermanent = async () => {
    if (!confirmDate) {
      setConfirmError('Please select the Permanent Effective Date');
      return;
    }
    if (!employeeId) {
      setConfirmError('Employee must be saved first before confirming as permanent');
      return;
    }

    setConfirming(true);
    setConfirmError('');
    setConfirmResult(null);

    try {
      const response = await eimsApi.confirmPermanent(employeeId, confirmDate);
      const result = response.data?.data || response.data;
      setConfirmResult(result);
      // Update the local form state to reflect the change
      update({
        employmentType: 'Permanent',
        probationStatus: 'Confirmed',
        permanentEffectiveDate: confirmDate
      });
    } catch (err: any) {
      setConfirmError(err.response?.data?.message || err.message || 'Failed to confirm permanent');
    } finally {
      setConfirming(false);
    }
  };

  const currentManagerId = workstationData?.supervisorId || workstationData?.reportingManagerId || data?.reportingManagerId || '';

  return (
    <div className="space-y-8">
      {/* 1. Employment Details */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Employment Details</h3>

        <div className="mb-4"><label className="text-xs font-bold text-slate-500 mb-1 block">Organizational rank (separate from job designation)</label><select aria-label="Organizational rank" className="p-2 border border-slate-200 rounded-lg bg-white" value={data?.organizationalRank || 'EMPLOYEE'} onChange={e=>handleChange('organizationalRank',e.target.value)}>{['OWNER','CEO','DIRECTOR','DEPARTMENT_HEAD','MANAGER','TEAM_LEAD','SENIOR','EMPLOYEE'].map(rank=><option key={rank} value={rank}>{rank.replace(/_/g,' ')}</option>)}</select></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Company / Legal Entity *</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              value={data?.companyId || ''} onChange={e => handleChange('companyId', e.target.value)} required>
              <option value="">-- Select Company --</option>
              {eimData.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Employee Number *</label>
            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100" value={data?.employeeNumber || ''} onChange={e => handleChange('employeeNumber', e.target.value)} placeholder="Auto-generated" readOnly />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Company Join Date *</label>
            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.dateJoined || ''} onChange={e => {
              const val = e.target.value;
              const updates: any = { dateJoined: val };

              if (!data?.permanentEffectiveDate || data.permanentEffectiveDate === data.dateJoined) {
                updates.permanentEffectiveDate = val;
              }
              if (!data?.probationStartDate || data.probationStartDate === data.dateJoined) {
                updates.probationStartDate = val;
              }
              if (!data?.contractStartDate || data.contractStartDate === data.dateJoined) {
                updates.contractStartDate = val;
              }

              if (val) {
                const dateObj = new Date(val);
                if (!isNaN(dateObj.getTime())) {
                  dateObj.setFullYear(dateObj.getFullYear() + 1);
                  updates.expectedConfirmationDate = dateObj.toISOString().split('T')[0];
                }
              }

              update(updates);
            }} required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Employment Type *</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.employmentTypeId || ''} onChange={e => {
              const val = e.target.value;
              const typeName = eimData.employmentTypes.find(t => t.id === val)?.name;
              update({
                employmentTypeId: val,
                probationStatus: typeName === 'Probation' ? 'Probation' : (typeName === 'Permanent' ? 'Confirmed' : 'Active')
              });
            }} required>
              <option value="">-- Select Type --</option>
              {eimData.employmentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {isPermanent && (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Permanent Effective Date *</label>
              <input type="date" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.permanentEffectiveDate || ''} onChange={e => handleChange('permanentEffectiveDate', e.target.value)} required={isPermanent} />
            </div>
          )}
          {isProbation && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Probation Start Date</label>
                <input type="date" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.probationStartDate || ''} onChange={e => handleChange('probationStartDate', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Expected Confirmation Date</label>
                <input type="date" className="w-full p-2 border border-slate-200 rounded-lg" value={data?.expectedConfirmationDate || ''} onChange={e => handleChange('expectedConfirmationDate', e.target.value)} />
              </div>
            </>
          )}
          {isContract && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Contract Start Date *</label>
                <input type="date" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.contractStartDate || ''} onChange={e => handleChange('contractStartDate', e.target.value)} required={isContract} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Contract End Date *</label>
                <input type="date" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={data?.contractEndDate || ''} onChange={e => handleChange('contractEndDate', e.target.value)} required={isContract} />
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Reporting Manager *</label>
            {eligibleManagers.length > 0 ? (
              <select
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                value={currentManagerId}
                onChange={e => {
                  const val = e.target.value;
                  updateWorkstation({ supervisorId: val, reportingManagerId: val });
                  handleChange('reportingManagerId', val);
                }}
              >
                <option value="">-- Select Reporting Manager --</option>
                {eligibleManagers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.fullName} ({m.employeeNo}) - {m.designation || 'Staff'}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                value={currentManagerId}
                onChange={e => {
                  const val = e.target.value;
                  updateWorkstation({ supervisorId: val, reportingManagerId: val });
                  handleChange('reportingManagerId', val);
                }}
                placeholder="Select or enter supervisor ID"
              />
            )}
          </div>

        </div>
      </div>
      {/* 2. Organisation & Job Assignment */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Organisation & Job Assignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Business Unit / Division *</label>
            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={workstationData?.businessUnit || ''} onChange={e => handleWorkstationChange('businessUnit', e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Department *</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={workstationData?.departmentId || ''} onChange={e => handleWorkstationChange('departmentId', e.target.value)} required>
              <option value="">-- Select Department --</option>
              {eimData.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Section / Team / Unit</label>
            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={workstationData?.section || ''} onChange={e => handleWorkstationChange('section', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Work Location *</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={workstationData?.locationId || ''} onChange={e => handleWorkstationChange('locationId', e.target.value)} required>
              <option value="">-- Select Location --</option>
              {eimData.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Designation / Job Title *</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg bg-white" value={workstationData?.designationId || ''} onChange={e => {
              const val = e.target.value;
              const dName = eimData.designations.find((d: any) => d.id === val)?.name || '';
              handleWorkstationChange('designationId', val);
              handleWorkstationChange('designation', dName);
            }} required>
              <option value="">-- Select Designation --</option>
              {eimData.designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Job Grade</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg" value={workstationData?.salaryGradeId || ''} onChange={e => handleWorkstationChange('salaryGradeId', e.target.value)}>
              <option value="">-- Select Salary Grade --</option>
              {eimData.salaryGrades.map(sg => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Functional Role</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg" value={workstationData?.functionalRoleId || ''} onChange={e => handleWorkstationChange('functionalRoleId', e.target.value)}>
              <option value="">-- Select Functional Role --</option>
              {eimData.functionalRoles.map(fr => <option key={fr.id} value={fr.id}>{fr.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Indirect Supervisor</label>
            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={workstationData?.indirectSupervisorId || ''} onChange={e => handleWorkstationChange('indirectSupervisorId', e.target.value)} placeholder="Employee ID" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Cost Centre</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg" value={workstationData?.costCentreId || ''} onChange={e => handleWorkstationChange('costCentreId', e.target.value)}>
              <option value="">-- Select Cost Centre --</option>
              {eimData.costCentres.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Cost Allocation %</label>
            <input type="number" className="w-full p-2 border border-slate-200 rounded-lg" value={workstationData?.costAllocationPercentage || 100} onChange={e => handleWorkstationChange('costAllocationPercentage', Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !confirming && setShowConfirmDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Confirm as Permanent</h2>
                  <p className="text-sm text-slate-500">This action will assign the Permanent Leave Group and calculate leave entitlements.</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-700">
                  <p className="font-medium">This action cannot be undone.</p>
                  <p className="mt-1">The system will use the <strong>original joining date ({data?.dateJoined || 'N/A'})</strong> to calculate leave entitlements. The entitlements will become available from the permanent effective date you select below.</p>
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Permanent Effective Date *</label>
                <input
                  type="date"
                  className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  value={confirmDate}
                  onChange={e => setConfirmDate(e.target.value)}
                  disabled={confirming}
                />
              </div>

              {/* Error */}
              {confirmError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {confirmError}
                </div>
              )}

              {/* Success Result */}
              {confirmResult && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-800">Confirmation Successful</span>
                    </div>
                    <p className="text-xs text-emerald-700">Assigned to Leave Group: <strong>{confirmResult.leaveGroupAssigned}</strong></p>
                  </div>

                  {/* Entitlement Table */}
                  {confirmResult.entitlements && confirmResult.entitlements.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left p-2 text-xs font-bold text-slate-600">Leave Type</th>
                            <th className="text-right p-2 text-xs font-bold text-slate-600">Calculated</th>
                            <th className="text-right p-2 text-xs font-bold text-slate-600">Previously Granted</th>
                            <th className="text-right p-2 text-xs font-bold text-slate-600">Already Used</th>
                            <th className="text-right p-2 text-xs font-bold text-emerald-700">Net New</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confirmResult.entitlements.filter(ent => ent.calculatedDays > 0).map((ent, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="p-2 text-slate-700 font-medium">{ent.leaveTypeName}</td>
                              <td className="p-2 text-right text-slate-600">{ent.calculatedDays}</td>
                              <td className="p-2 text-right text-slate-500">{ent.alreadyGranted}</td>
                              <td className="p-2 text-right text-slate-500">{ent.alreadyUsed}</td>
                              <td className="p-2 text-right font-bold text-emerald-700">{ent.netNewEntitlement}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              {!confirmResult ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={confirming}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPermanent}
                    disabled={confirming || !confirmDate}
                    className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirm Permanent
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


