export default function DoughnutChart({ present, absent }: { present: number; absent: number }) {
  const total = present + absent;
  if (total === 0) return null;

  const presentPct = (present / total) * 100;
  const absentPct = (absent / total) * 100;
  const r = 56;
  const circ = 2 * Math.PI * r;
  const presentLen = (presentPct / 100) * circ;
  const absentLen = (absentPct / 100) * circ;
  const gap = 4;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke="url(#gradPresent)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${presentLen - gap} ${circ - presentLen + gap}`}
          strokeDashoffset="0"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke="url(#gradAbsent)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${absentLen - gap} ${circ - absentLen + gap}`}
          strokeDashoffset={`${-(presentLen)}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <defs>
          <linearGradient id="gradPresent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="gradAbsent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.04em' }}>
          {total}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
          Total
        </span>
      </div>
    </div>
  );
}
