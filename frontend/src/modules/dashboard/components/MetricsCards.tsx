import { Users, Clock, CheckCircle2, Building2 } from 'lucide-react';

interface MetricsCardsProps {
  totalMembers: number;
  pendingInvites: number;
  onboarded: number;
  teams: number;
}

export default function MetricsCards({ totalMembers, pendingInvites, onboarded, teams }: MetricsCardsProps) {
  const metrics = [
    {
      id: 'total',
      label: 'Total Members',
      sublabel: 'Active employees',
      value: totalMembers,
      icon: <Users size={20} className="text-blue-500" />,
      bg: 'bg-blue-50'
    },
    {
      id: 'pending',
      label: 'Pending Invites',
      sublabel: 'Awaiting response',
      value: pendingInvites,
      icon: <Clock size={20} className="text-orange-500" />,
      bg: 'bg-orange-50'
    },
    {
      id: 'onboarded',
      label: 'Onboarded',
      sublabel: 'Profiles complete',
      value: onboarded,
      icon: <CheckCircle2 size={20} className="text-purple-500" />,
      bg: 'bg-purple-50'
    },
    {
      id: 'teams',
      label: 'Teams',
      sublabel: 'Departments',
      value: teams,
      icon: <Building2 size={20} className="text-emerald-500" />,
      bg: 'bg-emerald-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(4,minmax(0,10rem))]">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="dashboard-metric-card relative overflow-hidden rounded-xl border border-white bg-white/80 p-3 shadow-md shadow-slate-200/50"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${metric.bg}`}>
              {metric.icon}
            </div>
            <span className="text-2xl font-black text-slate-800">
              {metric.value}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-700">{metric.label}</h3>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            {metric.sublabel}
          </p>
        </div>
      ))}
    </div>
  );
}
