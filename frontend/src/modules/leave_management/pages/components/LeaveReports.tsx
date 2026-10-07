import { useState, useEffect } from 'react';
import { Loader2, Download, Search, HelpCircle, CalendarDays, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { leaveApi } from '../../../../lib/api/leave';
import { useToast } from '../../../../components/ui/ToastProvider';

export default function LeaveReports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showLogicHelp, setShowLogicHelp] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await leaveApi.getEntitlementsReport();
      if (res.success) {
        setReportData(res.data);
      }
    } catch (error) {
      console.error(error);
      showToast('Error', 'Failed to fetch report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = reportData.filter(row => {
    if (showAll) return true;
    const nameMatch = row.name ? row.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const idMatch = row.employeeId ? row.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    return nameMatch || idMatch;
  });

  const handleExport = () => {
    // Basic CSV export logic
    const headers = ['Employee ID', 'Name', 'Joined Date', 'AL', 'ML', 'CL', 'MAT', 'PAT'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.employeeId,
        `"${row.name}"`,
        row.joinDate,
        Number(row.balances['AL'] || 0),
        Number(row.balances['ML'] || 0),
        Number(row.balances['CL'] || 0),
        Number(row.balances['MAT'] || 0),
        Number(row.balances['PAT'] || 0),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Leave_Entitlements_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 anim-fade-up">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search employees..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (showAll) setShowAll(false);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 transition-shadow"
            />
          </div>
          <button 
            onClick={() => {
              setShowAll(true);
              setSearchTerm('');
            }}
            className="btn-secondary bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            All Employees
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Leave Entitlements</h2>
          <p className="text-sm text-slate-500">Current leave balances for all active employees.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowLogicHelp(true)}
            className="btn-secondary bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2 px-4"
          >
            <HelpCircle size={16} /> Leave Rules
          </button>
          <button 
            onClick={handleExport}
            className="btn-primary flex items-center gap-2 px-4"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {searchTerm.trim() === '' && !showAll ? (
          <div className="bg-white rounded-3xl p-12 shadow-xl shadow-slate-200/40 border border-slate-100 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Search for an Employee</h3>
            <p className="text-slate-500 max-w-sm">Enter an employee name or ID in the search bar above to view their leave entitlements.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-wider">Employee ID</th>
                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-wider">Joined Date</th>
                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">AL</th>
                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">ML</th>
                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">CL</th>
                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">MAT</th>
                    <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">PAT</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? filteredData.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-sm font-semibold text-slate-700">{row.employeeId}</td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-800">{row.name}</td>
                      <td className="py-4 px-4 text-sm text-slate-500">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-semibold">
                          {row.joinDate}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-700 text-center">{Number(row.balances['AL'] || 0)}</td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-700 text-center">{Number(row.balances['ML'] || 0)}</td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-700 text-center">{Number(row.balances['CL'] || 0)}</td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-700 text-center">{Number(row.balances['MAT'] || 0)}</td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-700 text-center">{Number(row.balances['PAT'] || 0)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        No employees found matching "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                        <li><span className="font-semibold">Probation Employees:</span> Joined Year: 0.5 days/month | Subsequent Years: 7 days</li>
                        <li><span className="font-semibold">Confirmed Employees:</span> Permanent: 7 days (Probation leaves taken are deducted)</li>
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
    </div>
  );
}
