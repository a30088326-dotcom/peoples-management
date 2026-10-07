import React, { useState, useEffect } from 'react';
import { eimApi } from '../../lib/api/eimApi';
import EntityModal, { EntityType } from './EntityModal';
import { 
  Building2, MapPin, Network, GraduationCap, 
  Banknote, Briefcase, Users, UserCircle2, 
  Plus, Loader2
} from 'lucide-react';

export default function EIMDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<EntityType | null>(null);

  const fetchStats = () => {
    eimApi.getDashboardStats()
      .then(res => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Companies', value: stats?.companies || 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Total Locations', value: stats?.locations || 0, icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: 'Total Departments', value: stats?.departments || 0, icon: Network, color: 'text-violet-600', bg: 'bg-violet-100' },
    { title: 'Total Designations', value: stats?.designations || 0, icon: GraduationCap, color: 'text-pink-600', bg: 'bg-pink-100' },
    { title: 'Total Salary Grades', value: stats?.salaryGrades || 0, icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-100' },
    { title: 'Employment Types', value: stats?.employmentTypes || 0, icon: UserCircle2, color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  const quickActions = [
    { title: 'Add Company', onClick: () => setActiveModal('company') },
    { title: 'Add Location', onClick: () => setActiveModal('location') },
    { title: 'Add Department', onClick: () => setActiveModal('department') },
    { title: 'Add Designation', onClick: () => setActiveModal('designation') },
    { title: 'Add Salary Grade', onClick: () => setActiveModal('salaryGrade') },
  ];

  return (
    <div className="space-y-6">


      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-shadow hover:shadow-md">
              <div className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center ${card.bg} ${card.color}`}>
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,110px),1fr))] gap-4">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                  <Plus size={20} strokeWidth={2.5} />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 text-center">
                  {action.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {activeModal && (
        <EntityModal 
          entityType={activeModal} 
          onClose={(refresh) => {
            setActiveModal(null);
            if (refresh) fetchStats();
          }}
        />
      )}
    </div>
  );
}
