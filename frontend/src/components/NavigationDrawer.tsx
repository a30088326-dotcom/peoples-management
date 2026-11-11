import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

/** The same navigation becomes a modal drawer on phones and tablets. */
export default function NavigationDrawer({ compact, open, onClose, triggerRef, children }: {
  compact: boolean; open: boolean; onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>; children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!compact || !open) return;
    const frame = requestAnimationFrame(() => closeButton.current?.focus());
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]') || [])
        .filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keyboard);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
  }, [compact, open, triggerRef]);
  return <>
    {compact && open && <button type="button" aria-label="Dismiss navigation backdrop" onClick={onClose} className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm" />}
    <motion.aside ref={panel} initial={false}
      role={compact ? 'dialog' : undefined} aria-modal={compact && open ? true : undefined}
      aria-label="Main navigation" aria-hidden={compact && !open ? true : undefined} inert={compact && !open}
      data-mobile-drawer-open={compact && open ? 'true' : undefined}
      animate={compact ? { x: open ? 0 : -350 } : { width: open ? 280 : 80, x: 0 }}
      style={compact ? { width: 'min(320px, calc(100vw - 24px))' } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`${compact ? 'fixed inset-y-3 left-3 z-[110]' : 'relative m-4 z-50'} ${compact && !open ? 'invisible pointer-events-none' : ''} app-navigation flex flex-col glass border-r border-white/50 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden`}>
      {compact && <button ref={closeButton} type="button" aria-label="Close navigation" onClick={onClose} className="app-action app-action-icon absolute right-3 top-4 z-10 h-11 w-11"><X size={20} /></button>}
      {children}
    </motion.aside>
  </>;
}
