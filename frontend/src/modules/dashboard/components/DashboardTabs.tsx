
type TabId = 'active' | 'pending' | 'onboarding' | 'invites';

interface DashboardTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts: {
    active: number;
    pending: number;
    onboarding: number;
    invites: number;
  };
}

export default function DashboardTabs({ activeTab, onTabChange, counts }: DashboardTabsProps) {
  const tabs = [
    { id: 'active', label: 'Active Members', count: counts.active },
    { id: 'pending', label: 'Pending Employees', count: counts.pending },
    { id: 'onboarding', label: 'Onboarding', count: counts.onboarding },
    { id: 'invites', label: 'Invites', count: counts.invites },
  ] as const;

  return (
    <div className="flex items-center gap-6 border-b border-slate-200 px-6 pt-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as TabId)}
          className={`pb-4 px-2 relative font-bold text-sm transition-colors ${
            activeTab === tab.id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {tab.label}
            <span className={`text-[10px] py-0.5 px-2 rounded-full ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </div>
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
}
