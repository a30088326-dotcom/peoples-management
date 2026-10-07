import React from 'react';
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <div key={metric.id} className="bg-white/80 backdrop-blur-md border border-white shadow-xl shadow-slate-200/50 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            {metric.icon}
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${metric.bg}`}>
              {metric.icon}
            </div>
            <span className="text-4xl font-black text-slate-800">{metric.value}</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-700 text-sm">{metric.label}</h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">{metric.sublabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
