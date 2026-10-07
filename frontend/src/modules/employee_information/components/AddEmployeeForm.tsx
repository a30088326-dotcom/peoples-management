import { useAuth } from '../../../context/AuthContext';
import React, { useState, useEffect, useRef } from 'react';
import {
  User, Briefcase, Phone, X, FileText, Search, ArrowLeft, ArrowRight, Check, CalendarClock
} from 'lucide-react';
import PersonalDetailsTab from './tabs/PersonalDetailsTab';
import EmploymentDetailsTab from './tabs/EmploymentDetailsTab';
import ContactDetailsTab from './tabs/ContactDetailsTab';
import PayrollDetailsTab from './tabs/PayrollDetailsTab';
import AttachmentsTab from './tabs/AttachmentsTab';

import { eimsApi } from '../../../lib/api/employee_information_audit';
import { usersApi } from '../../../lib/api/users';
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
  onSuccess,
  employeeId: propEmployeeId,
  children
}: {
  onClose: () => void,
  onSuccess: () => void,
  employeeId?: string,
  children?: React.ReactNode
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | undefined>(propEmployeeId);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(e.target.value);
    if (query.length > 1) {
      try {
        const res = await usersApi.list({ limit: 500 });
        const onboarded = res.data.data.filter((u: any) => {
          const name = u.name?.toLowerCase() || '';
          const opName = u.onboardingProfile ? `${u.onboardingProfile.firstName} ${u.onboardingProfile.lastName}`.toLowerCase() : '';
          return name.includes(query) || opName.includes(query) || u.email.toLowerCase().includes(query);
        }).map((u: any) => ({
          ...u,
          displayName: u.name || (u.onboardingProfile ? `${u.onboardingProfile.firstName} ${u.onboardingProfile.lastName}` : u.email)
        }));
        setSearchResults(onboarded);
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Failed to search onboarded employees', err);
      }
    } else {
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
  };

  const handleSelectOnboarded = (user: any) => {
    if (user.employee && user.employee.id) {
      // User is already an employee! Switch to edit mode and fetch their details.
      setActiveEmployeeId(user.employee.id);
      setIsDropdownOpen(false);
      setSearchQuery('');
      return;
    }

    // Otherwise, populate form with user's onboarding data for a NEW employee
    setActiveEmployeeId(undefined);
    const profile = user.onboardingProfile;
    if (profile) {
      setFormData(prev => ({
        ...prev,
        userId: user.id,
        personalDetails: {
          ...prev.personalDetails,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          fullName: `${profile.firstName} ${profile.lastName}`.trim(),
          gender: profile.gender || '',
          dob: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
          nationality: profile.nationality || 'Sri Lankan'
        },
        contactDetails: {
          ...prev.contactDetails,
          linkedIn: profile.linkedIn || '',
          personal: {
            mobile: profile.phoneNumber || '',
            email: profile.alternatePhone || ''
          },
          official: {
            ...prev.contactDetails.official,
            email: user.email || ''
          },
          permanent: {
            ...prev.contactDetails.permanent,
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
          ...prev.payrollDetails,
          bankDetails: {
            ...prev.payrollDetails.bankDetails,
            bank: profile.bankName || '',
            accountName: profile.accountHolderName || '',
            accountNumber: profile.accountNumber || '',
            accountType: profile.accountType ? profile.accountType.charAt(0).toUpperCase() + profile.accountType.slice(1).toLowerCase() : 'Savings',
            currency: profile.currency || 'LKR'
          }
        }
      }));
    }
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const [formData, setFormData] = useState({
    userId: '',
    personalDetails: {
      title: '',
      firstName: '',
      middleName: '',
      lastName: '',
      preferredName: '',
      fullName: '',
      gender: '',
      nicNo: '',
      passportNo: '',
      dob: '',
      nationality: 'Sri Lankan',
      civilStatus: ''
    },
    employmentDetails: {
      company: '',
      employeeNumber: '',
      dateJoined: '',
      employmentType: 'Permanent',
      employmentTypeEffectiveDate: '',
      permanentEffectiveDate: '',
      probationStartDate: '',
      expectedConfirmationDate: '',
      contractStartDate: '',
      contractEndDate: '',
      employmentStatus: 'Active',
      statusEffectiveDate: '',
      workingHours: 8,
      payrollNo: '',
      payrollActive: true,
      timeAndAttendanceActive: true,
      retirementDate: '',
      dateResigned: '',
      lastWorkingDate: '',
      reasonForLeaving: ''
    },
    workstationDetails: {
      businessUnit: '',
      department: '',
      section: '',
      locationId: '',
      designationId: '',
      jobGrade: '',
      functionalRole: '',
      supervisorId: '',
      indirectSupervisorId: '',
      costCentre: '',
      costAllocationPercentage: 100
    },
    attendanceDetails: {
      rosterGroupId: '',
      effectiveStartDate: '',
      effectiveEndDate: ''
    },
    contactDetails: {
      personal: { mobile: '', email: '' },
      official: { email: '', mobile: '', ext: '', workLocation: '' },
      permanent: { address: '', city: '', province: '', postalCode: '', country: '' },
      working: { address: '', city: '', province: '', postalCode: '', country: '', sameAsPermanent: false },
      primaryContactPreference: 'personal_mobile',
      linkedIn: '',
      emergencyContacts: [] as any[]
    },
    payrollDetails: {
      dependents: [],
      statutoryDetails: { epfNo: '', taxId: '', workPermit: '' },
      salaryDetails: { basicSalary: 0, currency: 'LKR', effectiveDate: '' },
      bankDetails: { bank: '', branch: '', accountName: '', accountNumber: '', accountType: '', currency: 'LKR', paymentAllocation: 100, priority: 1, effectiveFrom: '', isActive: true }
    },
    otherDetails: []
  });


  React.useEffect(() => {
    if (activeEmployeeId) {
      setLoading(true);
      eimsApi.getEmployeeById(activeEmployeeId).then(res => {
        if (res.data.success && res.data.data) {
          const emp = formatDatesForInputs(res.data.data);
          setFormData({
            userId: emp.userId || formData.userId || '',
            personalDetails: { ...formData.personalDetails, ...(emp.personalDetails || {}) },
            employmentDetails: {
              ...formData.employmentDetails,
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
              ...formData.workstationDetails, 
              ...(emp.workstationDetails || {}),
              designation:emp.designation || emp.workstationDetails?.designationName || '',
              // reportingManagerId lives on the main employee record, not in workstationDetails sub-table
              reportingManagerId: emp.reportingManagerId || emp.workstationDetails?.reportingManagerId || '',
              supervisorId: emp.reportingManagerId || emp.workstationDetails?.supervisorId || '',
            },
            contactDetails: emp.contactDetails ? {
              ...formData.contactDetails,
              ...emp.contactDetails,
              linkedIn: emp.contactDetails.linkedIn || formData.contactDetails.linkedIn,
              personal: emp.contactDetails.residential?.personal || formData.contactDetails.personal,
              permanent: emp.contactDetails.permanent || {
                address: emp.contactDetails.residential?.address || '',
                city: emp.contactDetails.residential?.city || '',
                postalCode: emp.contactDetails.residential?.zipCode || ''
              },
              emergencyContacts: emp.contactDetails.residential?.emergencyContacts || formData.contactDetails.emergencyContacts,
              primaryContactPreference: emp.contactDetails.primaryContactOption || formData.contactDetails.primaryContactPreference,
            } : formData.contactDetails,
            attendanceDetails: {
              ...formData.attendanceDetails,
              ...(emp.attendance || {}),
            },
            payrollDetails: {
              ...formData.payrollDetails,
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
                accountName: emp.personalDetails?.fullName || ''
              } : formData.payrollDetails.bankDetails
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

  const handleSave = async (andNavigate = false) => {
    // Basic frontend validation for Cost Centre 100%
    if (formData.workstationDetails.costCentre) {
      if (formData.workstationDetails.costAllocationPercentage !== 100) {
        setError('Cost Centre allocation must exactly equal 100%.');
        return;
      }
    }

    setLoading(true);
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
        const isLastTab = activeTab === TABS.length - 1;
        if (isLastTab) {
          onSuccess();
        } else {
          // Show success toast but stay on same tab
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2500);
        }
      } else {
        setError(res.data.message || 'Failed to save employee.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Server error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-frame w-full">
      <div className="workspace-frame bg-slate-50 w-full rounded-2xl border border-slate-200 shadow-sm">

        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {activeEmployeeId ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {activeEmployeeId ? 'Update employee information.' : 'Complete all required sections below.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={searchRef}>
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-slate-400" />
                <input
                  type="text"
                  placeholder=""
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              {isDropdownOpen && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectOnboarded(user)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm"
                    >
                      <div className="font-medium text-slate-800">{user.displayName}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Global Employee Summary Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex-shrink-0 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
            <User size={24} className="text-slate-400" />
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-slate-500 font-medium">Employee No</div>
              <div className="font-semibold text-slate-800">{formData.employmentDetails.employeeNumber || 'Draft'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Full Name</div>
              <div className="font-semibold text-slate-800 truncate">{formData.personalDetails.fullName || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Designation</div>
              <div className="font-semibold text-slate-800 truncate">{(formData.workstationDetails as any).designation || formData.workstationDetails.designationId || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Status</div>
              <div className="font-semibold text-slate-800">{formData.employmentDetails.employmentStatus}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Type / Join Date</div>
              <div className="font-semibold text-slate-800">
                {formData.employmentDetails.employmentType} {formData.employmentDetails.dateJoined && `• ${formData.employmentDetails.dateJoined}`}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="shrink-0 bg-white px-4 sm:px-6 border-b border-slate-200 flex gap-8 overflow-x-auto">
          {TABS.map((tab, idx) => (
            <button
              key={tab.id}
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
          <div className="mx-6 mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
            <Check size={16} />
            Saved successfully!
          </div>
        )}

        {/* Content Area */}
        <WorkspaceScrollArea resetKey={activeTab} label="Employee details tab content">
          <fieldset disabled={!isAdmin} className="p-6">
            {activeTab === 0 && <PersonalDetailsTab data={formData.personalDetails} update={d => setFormData(prev => ({ ...prev, personalDetails: { ...prev.personalDetails, ...d } }))} />}
            {activeTab === 1 && <EmploymentDetailsTab data={formData.employmentDetails} workstationData={formData.workstationDetails} update={d => setFormData(prev => ({ ...prev, employmentDetails: { ...prev.employmentDetails, ...d } }))} updateWorkstation={d => setFormData(prev => ({ ...prev, workstationDetails: { ...prev.workstationDetails, ...d } }))} employeeId={activeEmployeeId} />}
            {activeTab === 2 && <ContactDetailsTab data={formData.contactDetails} update={d => setFormData(prev => ({ ...prev, contactDetails: { ...prev.contactDetails, ...d } }))} />}
            {activeTab === 3 && <PayrollDetailsTab data={formData.payrollDetails} update={d => setFormData(prev => ({ ...prev, payrollDetails: { ...prev.payrollDetails, ...d } }))} />}
            {activeTab === 4 && <AttachmentsTab employeeId={activeEmployeeId} />}
          </fieldset>
          {children}
        </WorkspaceScrollArea>

        {/* Footer Actions */}
        <div className="shrink-0 px-4 sm:pl-6 sm:pr-56 py-3 bg-white border-t border-slate-200 flex flex-wrap gap-3 justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={activeTab === 0}
            className="btn-secondary gap-2"
          >
            <ArrowLeft size={16} /> Previous
          </button>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>

            {/* Save – always visible, saves current tab, stays on same tab */}
            <button
              onClick={() => handleSave()}
              disabled={loading || !isAdmin}
              className="btn-primary gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            >
              {loading ? 'Saving...' : <><Check size={16} /> Save</>}
            </button>

            {/* Next – only shown when not on last tab, navigates without saving */}
            {activeTab < TABS.length - 1 && (
              <button
                onClick={handleNext}
                className="btn-primary gap-2"
              >
                Next <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
