export default function EmployeeFormActions({ activeTab, lastTab, busy, saving, canSave, onPrevious, onNext, onCancel, onSave }: {
  activeTab: number; lastTab: boolean; busy: boolean; saving: boolean; canSave: boolean;
  onPrevious: () => void; onNext: () => void; onCancel: () => void; onSave: () => void;
}) {
  return <footer className="employee-form-actions">
    <button type="button" onClick={onPrevious} disabled={busy || activeTab === 0} className="btn-secondary">Previous</button>
    <div>
      <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary">Cancel</button>
      <button type="button" onClick={onSave} disabled={busy || !canSave} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
      {!lastTab && <button type="button" onClick={onNext} disabled={busy} className="btn-primary">Next</button>}
    </div>
  </footer>;
}
