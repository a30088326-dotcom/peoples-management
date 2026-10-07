import React from 'react';
import type { Screen } from '../../../types';

export default function OnboardingHub({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Onboarding</h1>
      <p className="text-slate-600">
        Welcome to Onboarding. (This module has been retained as part of the core Onboarding functionality).
      </p>
      <div className="mt-8">
        <button 
          onClick={() => onNavigate('invite')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Send Invite
        </button>
      </div>
    </div>
  );
}
