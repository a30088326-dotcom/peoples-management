import { User, Briefcase, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import { ProtectedImage } from '../../../../components/ProtectedFile';

export default function EmployeeSummaryCard({ displayData }: { displayData: any }) {
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-2xl bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0">
          {displayData.profilePicture ? (
            <ProtectedImage src={displayData.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <User size={48} className="text-slate-400" />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="col-span-full mb-2">
            <h1 className="text-3xl font-black text-slate-800">{displayData.fullName}</h1>
            <p className="text-blue-600 font-bold">{displayData.designation} • {displayData.department}</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><User size={16} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Emp Number</p>
                <p className="font-medium text-slate-700">{displayData.employeeNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><Briefcase size={16} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Emp Type</p>
                <p className="font-medium text-slate-700">{displayData.employmentType}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><Mail size={16} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Email</p>
                <p className="font-medium text-slate-700 break-all">{displayData.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><Phone size={16} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Mobile</p>
                <p className="font-medium text-slate-700">{displayData.mobileNumber}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><Calendar size={16} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Joined Date</p>
                <p className="font-medium text-slate-700">{displayData.dateJoined}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500"><MapPin size={16} /></div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Office</p>
                <p className="font-medium text-slate-700">{displayData.officeLocation}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
