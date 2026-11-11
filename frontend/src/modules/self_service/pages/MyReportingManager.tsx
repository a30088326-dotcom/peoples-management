import { useState, useEffect } from 'react';
import { User, Phone, Mail, Building2, AlertCircle, UserCheck } from 'lucide-react';
import { api } from '../../../lib/api/client';
import { ProtectedImage } from '../../../components/ProtectedFile';

export default function MyReportingManager() {
  const [manager, setManager] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchManager = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/reporting-hierarchy/my-manager');
        if (res.data?.success) {
          setManager(res.data.data);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setManager(null);
        } else {
          setError('Failed to load reporting manager information.');
        }
        console.error('Error fetching reporting manager:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchManager();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading reporting manager details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!manager) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Reporting Manager Assigned</h3>
          <p className="text-sm text-slate-500">You currently do not have a reporting manager assigned in the system. Please contact HR to update your reporting line.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">My Reporting Manager</h2>
          <p className="text-sm text-slate-500">Your direct reporting line in the organization</p>
        </div>
      </div>

      {/* Manager Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {manager.avatar ? (
              <ProtectedImage src={manager.avatar} alt={manager.fullName} className="w-24 h-24 rounded-2xl object-cover shadow-md border-4 border-white" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md border-4 border-white">
                <span className="text-3xl font-black text-white">
                  {(manager.fullName || 'M').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              <UserCheck className="w-3 h-3" />
              Reporting Manager
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-1">{manager.fullName}</h3>
            <p className="text-base font-semibold text-blue-700 mb-1">{manager.designation || 'Staff'}</p>
            <p className="text-sm text-slate-500 mb-4">{manager.employeeNo}</p>

            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              {manager.department && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">{manager.department}</span>
                </div>
              )}
              {manager.personalEmail && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${manager.personalEmail}`} className="text-sm font-medium text-blue-600 hover:underline">{manager.personalEmail}</a>
                </div>
              )}
              {manager.mobilePhone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href={`tel:${manager.mobilePhone}`} className="text-sm font-medium">{manager.mobilePhone}</a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-6 pt-6 border-t border-blue-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-emerald-600">Active Employee</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Your direct reporting line</span>
        </div>
      </div>
    </div>
  );
}
