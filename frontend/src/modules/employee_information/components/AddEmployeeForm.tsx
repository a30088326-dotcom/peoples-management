import { createEmployeeFormData } from '../utils/employeeFormData';
import { useAuth } from '../../../context/AuthContext';
import { useState, useEffect } from 'react';
import { User, Briefcase, Phone, FileText } from 'lucide-react';
import PersonalDetailsTab from './tabs/PersonalDetailsTab';
import EmploymentDetailsTab from './tabs/EmploymentDetailsTab';
import ContactDetailsTab from './tabs/ContactDetailsTab';
import PayrollDetailsTab from './tabs/PayrollDetailsTab';
import AttachmentsTab from './tabs/AttachmentsTab';

import { eimsApi } from '../../../lib/api/employee_information_audit';
import { CustomEmployeeFields } from '../../assistant/Assistant';
import EmployeeFormHeader from './EmployeeFormHeader';
import EmployeeFormActions from './EmployeeFormActions';
import './employee-editor.css';
import WorkspaceScrollArea from '../../../components/WorkspaceScrollArea';

const formatDatesForInputs = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(obj)) {
      return obj.split('T')[0];
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(formatDatesForInputs);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = formatDatesForInputs(obj[key]);
    }
    return newObj;
  }
  return obj;
};

const TABS = [
  { id: 'personal', label: 'Personal Details', icon: User },
  { id: 'employment', label: 'Employment & Org', icon: Briefcase },
  { id: 'contact', label: 'Contact Details', icon: Phone },
  { id: 'payroll', label: 'Payroll & Benefits', icon: FileText },
  { id: 'attachments', label: 'Attachments', icon: FileText }
];

export default function AddEmployeeForm({
  onClose,
  employeeId: propEmployeeId
}: {
  onClose: () => void,
  employeeId?: string
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | undefined>(propEmployeeId);

  const handleSelectOnboarded = (user: any) => {
    setActiveTab(0);
    setSaveSuccess(false);
    setError('');
    if (user.employee && user.employee.id) {
      // User is already an employee! Switch to edit mode and fetch their details.
      setActiveEmployeeId(user.employee.id);
      return;
    }

    // Otherwise, populate form with user's onboarding data for a NEW employee
    setActiveEmployeeId(undefined);
    const profile = user.onboardingProfile || {};
    const draft = createEmployeeFormData();
    {
      setFormData(() => ({
        ...draft,
        userId: user.id,
        personalDetails: {
          ...draft.personalDetails,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
          gender: profile.gender || '',
          dob: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
          nationality: profile.nationality || 'Sri Lankan'
        },
        contactDetails: {
          ...draft.contactDetails,
          linkedIn: profile.linkedIn || '',
          personal: {
            mobile: profile.phoneNumber || '',
            alternatePhone: profile.alternatePhone || '',
            email: user.email || ''
          },
          official: {
            ...draft.contactDetails.official,
            email: user.email || ''
          },
          permanent: {
            ...draft.contactDetails.permanent,
            address: `${profile.addressLine1 || ''} ${profile.addressLine2 || ''}`.trim(),
            city: profile.city || '',
            postalCode: profile.postalCode || ''
          },
          emergencyContacts: profile.emergencyContactName ? [{
            name: profile.emergencyContactName,
            relationship: profile.emergencyContactRelation || 'Other',
            primaryPhone: profile.emergencyContactPhone || '',
            isPrimary: true,
            priority: 1
          }] : []
        },
        payrollDetails: {
          ...draft.payrollDetails,
          bankDetails: {
            ...draft.payrollDetails.bankDetails,
            bank: profile.bankName || '',
            accountName: profile.accountHolderName || '',
            accountNumber: profile.accountNumber || '',
            accountType: profile.accountType ? profile.accountType.charAt(0).toUpperCase() + profile.accountType.slice(1).toLowerCase() : 'Savings',
            currency: profile.currency || 'LKR'
          }
        }
      }));
    }
  };

  const [formData, setFormData] = useState(createEmployeeFormData);


  useEffect(() => {
    if (activeEmployeeId) {
      setLoading(true);
      eimsApi.getEmployeeById(activeEmployeeId).then(res => {
        if (res.data.success && res.data.data) {
          const emp = formatDatesForInputs(res.data.data);
          const draft = createEmployeeFormData();
          setFormData({
            userId: emp.userId || draft.userId || '',
            personalDetails: { ...draft.personalDetails, ...(emp.personalDetails || {}) },
            employmentDetails: {
              ...draft.employmentDetails,
              ...(emp.employmentDetails || {}),
              employeeNumber: emp.employeeNo || '',
              payrollNo: emp.payrollNo || '',
              payrollActive: emp.payrollActive !== false,
              timeAndAttendanceActive: emp.timeAndAttendanceActive !== false,
              employmentStatus: emp.employeeStatus || 'Active',

              // IMPORTANT:
              // Keep both the FK id and display name in frontend state.
              organizationalRank: emp.organizationalRank || 'EMPLOYEE',
              companyId:emp.companyId || emp.workstationDetails?.companyId || '',
              employmentTypeId: emp.employmentType?.id || emp.employmentTypeId || '',
              employmentType: emp.employmentType?.name || '',
            },
            workstationDetails: { 
              ...draft.workstationDetails,
              ...(emp.workstationDetails || {}),
              designation:emp.designation || emp.workstationDetails?.designationName || '',
              // reportingManagerId lives on the main employee record, not in workstationDetails sub-table
              reportingManagerId: emp.reportingManagerId || emp.workstationDetails?.reportingManagerId || '',
              supervisorId: emp.reportingManagerId || emp.workstationDetails?.supervisorId || '',
            },
            contactDetails: emp.contactDetails ? {
              ...draft.contactDetails,
              ...emp.contactDetails,
              linkedIn: emp.contactDetails.linkedIn || draft.contactDetails.linkedIn,
              personal: emp.contactDetails.residential?.personal || draft.contactDetails.personal,
              permanent: emp.contactDetails.permanent || {
                address: emp.contactDetails.residential?.address || '',
                city: emp.contactDetails.residential?.city || '',
                postalCode: emp.contactDetails.residential?.zipCode || ''
              },
              emergencyContacts: emp.contactDetails.residential?.emergencyContacts || draft.contactDetails.emergencyContacts,
              primaryContactPreference: emp.contactDetails.primaryContactOption || draft.contactDetails.primaryContactPreference,
            } : draft.contactDetails,
            attendanceDetails: {
              ...draft.attendanceDetails,
              ...(emp.attendance || {}),
            },
            payrollDetails: {
              ...draft.payrollDetails,
              salaryDetails: {
                basicSalary: emp.employmentDetails?.basicSalary || 0,
                currency: emp.employmentDetails?.currency || 'LKR',
                effectiveDate: emp.employmentDetails?.nextIncrementDate ? emp.employmentDetails.nextIncrementDate.split('T')[0] : ''
              },
              bankDetails: emp.bankDetails && emp.bankDetails.length > 0 ? {
                bank: emp.bankDetails[0].bankName || '',
                branch: emp.bankDetails[0].branch || '',
                accountType: emp.bankDetails[0].accountType ? emp.bankDetails[0].accountType.charAt(0).toUpperCase() + emp.bankDetails[0].accountType.slice(1).toLowerCase() : 'Savings',
                accountNumber: emp.bankDetails[0].accountNo || '',
                currency: emp.bankDetails[0].currency || 'LKR',
                paymentAllocation: emp.bankDetails[0].amountOrPercentage || 100,
                priority: emp.bankDetails[0].priority || 1,
                effectiveFrom: '',
                isActive: emp.bankDetails[0].isActive !== false,
                accountName: emp.bankDetails[0].accountHolderName || emp.personalDetails?.fullName || ''
              } : draft.payrollDetails.bankDetails
            },
            otherDetails: emp.otherDetails || []
          });
        }
      }).catch(err => {
        setError('Failed to load employee details.');
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [activeEmployeeId]);



  const handleNext = () => {
    if (activeTab < TABS.length - 1) setActiveTab(t => t + 1);
  };
  const handlePrev = () => {
    if (activeTab > 0) setActiveTab(t => t - 1);
  };


  const {isAdmin}=useAuth();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (loading || saving) return;
    // Basic frontend validation for Cost Centre 100%
    if (formData.workstationDetails.costCentre) {
      if (formData.workstationDetails.costAllocationPercentage !== 100) {
        setError('Cost Centre allocation must exactly equal 100%.');
        return;
      }
    }

    setSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      let res;
      // Extract resignation details from employment details
      const resignationDetails = {
        dateResigned: formData.employmentDetails.dateResigned,
        dateOfRetirement: formData.employmentDetails.lastWorkingDate,
        reasonForLeaving: formData.employmentDetails.reasonForLeaving
      };

      const finalPayload = {
        ...formData,
        userId: formData.userId || undefined,
        resignationDetails: (resignationDetails.dateResigned || resignationDetails.reasonForLeaving) ? resignationDetails : undefined,
      };

      if (activeEmployeeId) {
        res = await eimsApi.updateEmployee(activeEmployeeId, finalPayload);
      } else {
        res = await eimsApi.createEmployee(finalPayload);
      }

      if (res.data.success) {
        // If a new employee was just created, capture the returned employee ID
        if (!activeEmployeeId && res.data.data?.id) {
          setActiveEmployeeId(res.data.data.id);
        }
        setSaveSuccess(true);
      } else {
        setError(res.data.message || 'Failed to save employee.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Server error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-frame w-full">
      <div className="workspace-frame employee-editor">

        <EmployeeFormHeader employeeId={activeEmployeeId} data={formData} busy={loading || saving} onSelect={handleSelectOnboarded} />

        {/* Tab Navigation */}
        <div className="employee-editor-tabs" role="navigation" aria-label="Employee sections">
          {TABS.map((tab, idx) => (
            <button
              key={tab.id}
              type="button"
              disabled={loading || saving}
              onClick={() => setActiveTab(idx)}
              aria-current={activeTab === idx ? 'page' : undefined}
              className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === idx
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="employee-editor-message border border-red-200 bg-red-50 text-red-700">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div role="status" className="employee-editor-message border border-emerald-200 bg-emerald-50 text-emerald-700">
            Saved successfully!
          </div>
        )}

        {loading && <p role="status" className="employee-editor-message text-slate-500">Loading employee details…</p>}

        {/* Content Area */}
        <WorkspaceScrollArea resetKey={activeTab} label="Employee details tab content">
          <fieldset disabled={!isAdmin || loading || saving} className="employee-editor-content">
            {activeTab === 0 && <PersonalDetailsTab data={formData.personalDetails} update={d => setFormData(prev => ({ ...prev, personalDetails: { ...prev.personalDetails, ...d } }))} />}
            {activeTab === 1 && <EmploymentDetailsTab data={formData.employmentDetails} workstationData={formData.workstationDetails} update={d => setFormData(prev => ({ ...prev, employmentDetails: { ...prev.employmentDetails, ...d } }))} updateWorkstation={d => setFormData(prev => ({ ...prev, workstationDetails: { ...prev.workstationDetails, ...d } }))} employeeId={activeEmployeeId} />}
            {activeTab === 2 && <ContactDetailsTab data={formData.contactDetails} update={d => setFormData(prev => ({ ...prev, contactDetails: { ...prev.contactDetails, ...d } }))} />}
            {activeTab === 3 && <PayrollDetailsTab data={formData.payrollDetails} update={d => setFormData(prev => ({ ...prev, payrollDetails: { ...prev.payrollDetails, ...d } }))} />}
            {activeTab === 4 && <AttachmentsTab employeeId={activeEmployeeId} />}
          </fieldset>
          {activeEmployeeId && <CustomEmployeeFields employeeId={activeEmployeeId} />}
        </WorkspaceScrollArea>

        <EmployeeFormActions activeTab={activeTab} lastTab={activeTab === TABS.length - 1}
          busy={loading || saving} saving={saving} canSave={isAdmin}
          onPrevious={handlePrev} onNext={handleNext} onCancel={onClose} onSave={() => void handleSave()} />
      </div>
    </div>
  );
}
