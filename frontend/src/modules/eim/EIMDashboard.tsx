import { useState, useEffect } from 'react';
import { eimApi } from '../../lib/api/eimApi';
import { 
  Building2, MapPin, Network, GraduationCap, 
  Banknote, UserCircle2, 
  Loader2
} from 'lucide-react';

export default function EIMDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="eim-stats-grid grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3 sm:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="eim-stat-card min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-shadow hover:shadow-md">
              <div className={`eim-stat-icon w-14 h-14 shrink-0 rounded-full flex items-center justify-center ${card.bg} ${card.color}`}>
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
    </div>
  );
}
