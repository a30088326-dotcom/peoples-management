import { ShieldAlert, ArrowLeft } from 'lucide-react';
import type { Screen } from '../types';

interface UnauthorizedProps {
  onNavigate: (s: Screen) => void;
  dashboardScreen: Screen;
}

export default function Unauthorized({ onNavigate, dashboardScreen }: UnauthorizedProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="card max-w-md w-full text-center anim-scale-in" style={{ padding: '3rem 2rem', background: 'rgba(255,255,255,0.85)' }}>
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg,#fee2e2,#fecaca)' }}>
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">403 Unauthorized</h1>
        <p className="text-slate-500 mb-8 text-sm">
          You don't have permission to access this area. This section is restricted to Administrators only.
        </p>
        <button
          onClick={() => onNavigate(dashboardScreen)}
          className="btn-primary flex items-center justify-center gap-2 w-full"
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </button>
      </div>
    </div>
  );
}
