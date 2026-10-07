import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Keep tab scrolling inside the workspace, without moving its header or menus. */
export default function WorkspaceScrollArea({ children, resetKey, className = '', label = 'Module content' }: {
  children: ReactNode;
  resetKey?: string | number;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [resetKey]);
  return <div ref={ref} role="region" aria-label={label} tabIndex={0} className={`workspace-scroll ${className}`}>{children}</div>;
}
