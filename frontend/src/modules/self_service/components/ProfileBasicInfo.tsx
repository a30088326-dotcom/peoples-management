import { useProfileRequest } from './ProfileRequestForm';
import { Phone, MapPin, Building, Edit2 } from 'lucide-react';

export default function ProfileBasicInfo({ employee, loading }: { employee: any, loading: boolean }) {
  const request=useProfileRequest();
  if (loading || !employee) {
    return <div className="animate-pulse space-y-6">
      <div className="h-64 bg-slate-100 rounded-2xl"></div>
      <div className="h-96 bg-slate-100 rounded-2xl"></div>
    </div>;
  }

  const { personalDetails } = employee;

  return (
    <div className="space-y-6">
      
      {/* Basic Information */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Basic Information</h3>
          <button onClick={()=>request({section:'basic',operation:'update',values:{...personalDetails,maritalStatus:personalDetails?.maritalStatus||personalDetails?.civilStatus,dob:personalDetails?.dob||personalDetails?.dateOfBirth}})} className="btn-secondary gap-2 text-sm">
            <Edit2 size={14} /> Request Edit
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Employee Number</label>
            <p className="text-slate-800 font-medium">{employee.employeeNo || 'N/A'} <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded ml-2">Read-only</span></p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
            <p className="text-slate-800 font-medium">{personalDetails?.fullName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Title</label>
            <p className="text-slate-800 font-medium">{personalDetails?.title || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
            <p className="text-slate-800 font-medium">{personalDetails?.gender || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nationality</label>
            <p className="text-slate-800 font-medium">{personalDetails?.nationality || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date of Birth</label>
            <p className="text-slate-800 font-medium">{personalDetails?.dob || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">National ID / NIC</label>
            <p className="text-slate-800 font-medium">{personalDetails?.nicNo || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Marital Status</label>
            <p className="text-slate-800 font-medium">{personalDetails?.maritalStatus || personalDetails?.civilStatus || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Contact Information</h3>
          <button onClick={()=>request({section:'contact',operation:'update',values:{...employee.contactDetails?.permanent,...employee.contactDetails?.residential?.personal,workingAddress:employee.contactDetails?.working?.address}})} className="btn-secondary gap-2 text-sm">
            <Edit2 size={14} /> Update Contacts
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          
          {/* Permanent Address */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" /> Permanent Address
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="col-span-full">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address Lines</label>
                <p className="text-slate-800 font-medium">{employee.contactDetails?.permanent?.address || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">City / Town</label>
                <p className="text-slate-800 font-medium">{employee.contactDetails?.permanent?.city || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Postal Code</label>
                <p className="text-slate-800 font-medium">{employee.contactDetails?.permanent?.postalCode || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Country</label>
                <p className="text-slate-800 font-medium">{employee.contactDetails?.permanent?.country || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Working Address */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Building size={16} className="text-indigo-500" /> Working Day Address
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="col-span-full">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address Lines</label>
                <p className="text-slate-800 font-medium">{employee.contactDetails?.working?.address || 'Same as Permanent Address'}</p>
              </div>
            </div>
          </div>

          {/* Contact Numbers */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Phone size={16} className="text-emerald-500" /> Phone & Email
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Personal Mobile</label>
                <p className="text-slate-800 font-medium">{employee.contactDetails?.residential?.personal?.mobile || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alternate Phone</label>
                <p className="text-slate-800 font-medium">{employee.contactDetails?.residential?.personal?.alternatePhone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">LinkedIn</label>
                <p className="text-slate-800 font-medium break-all">{employee.contactDetails?.linkedIn || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Home Telephone</label>
                <p className="text-slate-800 font-medium">{employee.contactDetails?.residential?.personal?.telephone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Personal Email</label>
                <p className="text-slate-800 font-medium break-all">{employee.contactDetails?.residential?.personal?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Official Email</label>
                <p className="text-slate-800 font-medium break-all">{employee.contactDetails?.official?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Office Telephone</label>
                <p className="text-slate-800 font-medium">{employee.contactDetails?.official?.telephone || 'N/A'}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
