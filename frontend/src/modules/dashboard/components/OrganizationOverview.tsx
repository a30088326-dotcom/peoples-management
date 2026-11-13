import { useEffect, useState } from 'react';
import { api } from '../../../lib/api/client';
export default function OrganizationOverview({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data,setData]=useState<any>(null), [error,setError]=useState('');
  useEffect(()=>{let live=true;api.get<any>('/api/organization/dashboard').then(r=>{if(live){setData(r.data.data);setError('');}}).catch(e=>{if(live)setError(e.message||'Unable to load organization summary.');});return()=>{live=false;};},[refreshKey]);
  if(error)return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if(!data)return <p className="text-sm text-slate-400">Loading organization summary…</p>;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-bold text-slate-800">{data.scope} overview · {data.rank?.replaceAll('_', ' ')}</h2>
        <span className="text-xs text-slate-500">Attendance date: {data.attendance.date} · {data.attendance.notRecorded} not recorded</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.departments.map((d: { name: string; total: number }) => (
          <span key={d.name} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs text-blue-700">
            {d.name}: {d.total}
          </span>
        ))}
      </div>
    </section>
  );
}
