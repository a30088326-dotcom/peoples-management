import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Field({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  const fieldId = useId();
  const control = React.isValidElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(children)
    ? React.cloneElement(children, {
      id: children.props.id || fieldId,
      'aria-describedby': error ? `${fieldId}-error` : children.props['aria-describedby'],
      'aria-invalid': Boolean(error),
    })
    : children;
  return (
    <div>
      <label className="input-label" htmlFor={React.isValidElement<{ id?: string }>(children) ? children.props.id || fieldId : undefined}>
        {label} {required && <span className="text-red-400 normal-case font-normal">*</span>}
      </label>
      {control}
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}
