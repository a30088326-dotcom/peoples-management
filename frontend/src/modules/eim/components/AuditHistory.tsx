import { useState, useEffect, useMemo } from 'react';
import { History, Loader2, Search } from 'lucide-react';
import { eimApi } from '../../../lib/api/eimApi';

type AuditLog = {
  id: string;
  changedAt: string;
  changedBy?: string;
  action: string;
  module: string;
  recordId?: string;
  reasonForChange?: string;
  newValue?: unknown;
  previousValue?: unknown;
};

function readSnapshot(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
}

export default function AuditHistory() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await eimApi.getAuditLogs();
      setLogs(res.data.data || []);
    } catch(e) {
      console.error("Failed to load audit logs", e);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const records = useMemo(() => logs.map(log => {
    const current = readSnapshot(log.newValue);
    const previous = readSnapshot(log.previousValue);
    const name = firstText(current.name, current.fieldLabel, previous.name, previous.fieldLabel);
    const code = firstText(current.code, current.fieldName, previous.code, previous.fieldName);
    return { ...log, name, code };
  }), [logs]);

  const lowerQuery = searchQuery.trim().toLowerCase();
  const filteredLogs = records.filter(log => [
    log.changedBy, log.action, log.module, log.name, log.code, log.recordId, log.reasonForChange,
  ].some(value => value?.toLowerCase().includes(lowerQuery)));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
            <History className="text-indigo-600" size={20} /> Master Data Audit History
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table tabIndex={0} className="responsive-data-table w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr><th className="px-4 py-3">Date & Time</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Reason</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-slate-500">{new Date(log.changedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{log.changedBy}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' : log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.module}</td>
                    <td className="px-4 py-3 break-words" title={log.recordId ? `Record ID: ${log.recordId}` : undefined}>
                      <span className={log.name || log.code ? 'font-medium text-slate-800' : 'font-mono text-xs text-slate-500'}>
                        {log.name || log.code || log.recordId || '—'}
                      </span>
                      {log.name && log.code && log.name !== log.code && (
                        <span className="block text-xs text-slate-500">{log.code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 truncate max-w-xs">{log.reasonForChange || '-'}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No audit logs found. Change some records to generate logs!</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
