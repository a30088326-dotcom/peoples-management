import { useState } from 'react';
import AddEmployeeForm from '../components/AddEmployeeForm';

export default function AdvancedEims() {
  const [draft, setDraft] = useState(0);
  return <div className="workspace-frame employee-workspace">
    <AddEmployeeForm key={draft} onClose={() => setDraft(value => value + 1)} />
  </div>;
}
