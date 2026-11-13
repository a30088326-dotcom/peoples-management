import { useState, useEffect } from 'react';
import { eimApi } from '../../lib/api/eimApi';
import { 
  Building2, MapPin, Network, GraduationCap, 
  Banknote, UserCircle2, 
  Loader2
} from 'lucide-react';

export type OverviewDestination =
  | { tab: 'organization'; subtab: 'companies' | 'locations' | 'hierarchy' }
  | { tab: 'jobs'; subtab: 'designations' | 'salaryGrades' }
  | { tab: 'employee-reference'; subtab?: never };

export default function EIMDashboard({ onOpen }: { onOpen: (destination: OverviewDestination) => void }) {
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
    { title: 'Total Companies', value: stats?.companies || 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100', destination: { tab: 'organization', subtab: 'companies' } },
    { title: 'Total Locations', value: stats?.locations || 0, icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-100', destination: { tab: 'organization', subtab: 'locations' } },
    { title: 'Total Departments', value: stats?.departments || 0, icon: Network, color: 'text-violet-600', bg: 'bg-violet-100', destination: { tab: 'organization', subtab: 'hierarchy' } },
    { title: 'Total Designations', value: stats?.designations || 0, icon: GraduationCap, color: 'text-pink-600', bg: 'bg-pink-100', destination: { tab: 'jobs', subtab: 'designations' } },
    { title: 'Total Salary Grades', value: stats?.salaryGrades || 0, icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-100', destination: { tab: 'jobs', subtab: 'salaryGrades' } },
    { title: 'Employment Types', value: stats?.employmentTypes || 0, icon: UserCircle2, color: 'text-rose-600', bg: 'bg-rose-100', destination: { tab: 'employee-reference' } },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="eim-stats-grid grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3 sm:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => onOpen(card.destination)}
              className="eim-stat-card min-w-0 cursor-pointer rounded-xl! border border-slate-200 bg-white p-6 text-left shadow-sm flex items-center gap-4 transition-colors hover:border-indigo-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <span className={`eim-stat-icon w-14 h-14 shrink-0 rounded-full flex items-center justify-center ${card.bg} ${card.color}`}>
                <Icon aria-hidden="true" size={24} strokeWidth={2.5} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-500">{card.title}</span>
                <span className="block text-2xl font-bold text-slate-800">{card.value}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
