export const createEmployeeFormData = () => ({
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
      employmentType: '',
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
      personal: { mobile: '', alternatePhone: '', email: '' },
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
