import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, CalendarDays, Users, Code2, HelpCircle, X, Calendar } from 'lucide-react';
import type { Screen } from '../../../types';
import LeaveTypesConfig from './components/LeaveTypesConfig';
import LeaveGroupsConfig from './components/LeaveGroupsConfig';
import LeaveReports from './components/LeaveReports';
import HolidayCalendarTab from './components/HolidayCalendarTab';
import WorkspaceScrollArea from '../../../components/WorkspaceScrollArea';

interface LeaveManagementHubProps {
  onNavigate: (s: Screen) => void;
}

export default function LeaveManagementHub({ onNavigate }: LeaveManagementHubProps) {
  const [activeTab, setActiveTab] = useState('types');
  const [showLogicHelp, setShowLogicHelp] = useState(false);

  const tabs = [
    { id: 'types', label: 'Leave Types', icon: <Settings size={18} /> },
    { id: 'groups', label: 'Leave Groups', icon: <Users size={18} /> },
    { id: 'reports', label: 'Reports', icon: <Code2 size={18} /> },
    { id: 'holidays', label: 'Holiday Calendar', icon: <Calendar size={18} /> }
  ];

  return (
    <>
      <div className="workspace-frame ambient-bg">
        <div className="workspace-frame w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Header */}
          <div className="flex flex-wrap gap-4 items-start justify-between mb-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', boxShadow: '0 8px 28px rgba(15,23,42,0.3)' }}>
                <CalendarDays size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800" style={{ letterSpacing: '-0.03em' }}>Leave Management</h1>
                <p className="text-sm text-slate-400">Configure core leave policies and groups dynamically.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={() => setShowLogicHelp(true)} className="btn-secondary glass text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                <HelpCircle size={16} /> Logic Rules
              </button>
              <button onClick={() => onNavigate('dashboard')} className="btn-primary glass text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">
                Exit Leave Hub
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 bg-white/40 p-1.5 rounded-2xl backdrop-blur-md border border-white/50 w-fit max-w-full shrink-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors
                  ${activeTab === tab.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-white/20'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <WorkspaceScrollArea resetKey={activeTab} label="Leave management tab content" className="pb-8">
              <div key={activeTab}>
                {activeTab === 'types' && <LeaveTypesConfig />}
                {activeTab === 'groups' && <LeaveGroupsConfig />}
                {activeTab === 'reports' && <LeaveReports />}
                {activeTab === 'holidays' && <HolidayCalendarTab />}
              </div>
          </WorkspaceScrollArea>
        </div>
      </div>

      {/* Logic Help Modal */}
      <AnimatePresence>
        {showLogicHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 p-6 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Leave Calculation Logic</h2>
                  <p className="text-sm text-slate-400">System rules for automated entitlement generation</p>
                </div>
                <button onClick={() => setShowLogicHelp(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-8">
                {/* Annual Leave */}
                <div>
                  <h3 className="text-lg font-bold text-blue-600 mb-3 flex items-center gap-2">
                    <CalendarDays size={18} /> Annual Leave (AL)
                  </h3>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 text-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-blue-100/50 pb-2">
                      <span className="font-semibold text-slate-700">For the Joined Year</span>
                      <span className="font-bold text-slate-800">0 days</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Next Year after Joined Year:</span>
                      <ul className="mt-2 space-y-1.5 text-slate-600 ml-4 list-disc">
                        <li>Joined in Q1 (Jan - Mar) <span className="font-bold ml-2">14 days</span></li>
                        <li>Joined in Q2 (Apr - Jun) <span className="font-bold ml-2">10 days</span></li>
                        <li>Joined in Q3 (Jul - Sep) <span className="font-bold ml-2">7 days</span></li>
                        <li>Joined in Q4 (Oct - Dec) <span className="font-bold ml-2">4 days</span></li>
                      </ul>
                    </div>
                    <div className="flex justify-between items-center border-t border-blue-100/50 pt-2 mt-2">
                      <span className="font-semibold text-slate-700">From 2nd Year onwards</span>
                      <span className="font-bold text-slate-800">14 days</span>
                    </div>
                  </div>
                </div>

                {/* Medical Leave */}
                <div>
                  <h3 className="text-lg font-bold text-emerald-600 mb-3 flex items-center gap-2">
                    <CalendarDays size={18} /> Medical Leave (ML)
                  </h3>
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
                      <span className="font-semibold text-slate-700">For the Joined Year</span>
                      <span className="font-bold text-slate-800">0 days</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Next Year after Joined Year:</span>
                      <p className="text-slate-500 text-xs mt-1 mb-2">Decrements by 0.5 days for each month elapsed before joining.</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600 ml-4">
                        <div>• Jan <span className="font-bold">5.5 days</span></div>
                        <div>• Jul <span className="font-bold">2.5 days</span></div>
                        <div>• Feb <span className="font-bold">5.0 days</span></div>
                        <div>• Aug <span className="font-bold">2.0 days</span></div>
                        <div>• Mar <span className="font-bold">4.5 days</span></div>
                        <div>• Sep <span className="font-bold">1.5 days</span></div>
                        <div>• Apr <span className="font-bold">4.0 days</span></div>
                        <div>• Oct <span className="font-bold">1.0 days</span></div>
                        <div>• May <span className="font-bold">3.5 days</span></div>
                        <div>• Nov <span className="font-bold">0.5 days</span></div>
                        <div>• Jun <span className="font-bold">3.0 days</span></div>
                        <div>• Dec <span className="font-bold">0.0 days</span></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-emerald-100/50 pt-2 mt-2">
                      <span className="font-semibold text-slate-700">From 2nd Year onwards</span>
                      <span className="font-bold text-slate-800">7 days</span>
                    </div>
                  </div>
                </div>

                {/* Casual & Others */}
                <div>
                  <h3 className="text-lg font-bold text-purple-600 mb-3 flex items-center gap-2">
                    <CalendarDays size={18} /> Casual & Other Leaves
                  </h3>
                  <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 text-sm space-y-3">
                    <div>
                      <span className="font-semibold text-slate-700">Casual Leave (CL)</span>
                      <ul className="mt-1 space-y-1 text-slate-600 ml-4 list-disc">
                        <li>Joined Year: <span className="font-bold ml-1">0.5 days per active month</span></li>
                        <li>Subsequent Years: <span className="font-bold ml-1">7 days</span></li>
                      </ul>
                    </div>
                    <div className="border-t border-purple-100/50 pt-2 mt-2">
                      <span className="font-semibold text-slate-700">Maternity Leave</span>
                      <p className="mt-1 text-slate-600 ml-4">• Female employees: <span className="font-bold">84 days</span></p>
                    </div>
                    <div className="border-t border-purple-100/50 pt-2 mt-2">
                      <span className="font-semibold text-slate-700">Paternity Leave</span>
                      <p className="mt-1 text-slate-600 ml-4">• Male employees: <span className="font-bold">1 day</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
