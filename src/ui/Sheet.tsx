import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Phones get a bottom sheet. From 640 px up it is a centered dialog sized by its content. */
export type SheetSize = 'sm' | 'md' | 'lg' | 'xl';
const WIDTH: Record<SheetSize, string> = {
  sm: 'sm:max-w-[448px]',
  md: 'sm:max-w-[560px]',
  lg: 'sm:max-w-[960px]',
  xl: 'sm:max-w-[1200px]',
};

// Keyboard focus ring, the entrance motion and the hover feel live here so every screen shares them.
const STYLE_ID = 'olw-dialog-style';
function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
:where(button, a, input, textarea, select, summary, [role="button"], [tabindex]:not([tabindex="-1"])):where(:focus-visible) { outline: 3px solid #f472b6; outline-offset: 2px; }
:where(input, textarea, select):where(:focus-visible) { outline-offset: 0; }
[role="dialog"]:focus { outline: none; }
.olw-backdrop { animation: olw-fade 0.16s ease-out both; }
.olw-dialog { animation: olw-up 0.2s ease-out both; }
@keyframes olw-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes olw-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@media (min-width: 640px) { .olw-dialog { animation-name: olw-pop; } }
@keyframes olw-pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .olw-backdrop, .olw-dialog { animation: none; } }
.olw-body { scrollbar-width: thin; scrollbar-color: #e8c9c9 transparent; }
`;
  document.head.appendChild(s);
}
ensureStyle();

// ---- the stack of open dialogs: Escape and Back only ever act on the top one ----
interface Entry { id: string; close: () => void; el: () => HTMLElement | null; popped: boolean }
const stack: Entry[] = [];
let ignorePops = 0; // popstate events we caused ourselves by popping an entry we pushed
let listening = false;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const focusables = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((e) => e.offsetParent !== null || e === document.activeElement);

function onKey(e: KeyboardEvent) {
  const top = stack[stack.length - 1];
  if (!top) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    top.close();
  } else if (e.key === 'Tab') {
    const root = top.el();
    if (!root) return;
    const f = focusables(root);
    if (!f.length) {
      e.preventDefault();
      root.focus();
      return;
    }
    const first = f[0], last = f[f.length - 1], at = document.activeElement;
    if (!root.contains(at)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && (at === first || at === root)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && at === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function onPop() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  const top = stack[stack.length - 1];
  if (top && !top.popped) {
    top.popped = true; // the browser already took this entry off the history
    top.close();
  }
}

function listen(on: boolean) {
  if (on === listening) return;
  listening = on;
  const f = on ? document.addEventListener.bind(document) : document.removeEventListener.bind(document);
  f('keydown', onKey, true);
  (on ? window.addEventListener : window.removeEventListener).call(window, 'popstate', onPop);
}

/**
 * Dialog behaviour for anything that overlays the game: focus goes in, Tab stays inside, Escape and the browser Back button
 * close the top dialog only, and focus returns to what opened it. Attach the returned ref to the dialog panel.
 */
export function useDialog(onClose: () => void) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const entry: Entry = { id: titleId, close: () => closeRef.current(), el: () => panel.current, popped: false };
    stack.push(entry);
    listen(true);
    try {
      history.pushState({ olwDialog: titleId }, ''); // same address, so ?room links are untouched; Back closes the dialog
    } catch {
      /* a sandboxed page may refuse; Escape and the buttons still work */
    }
    // focus the first field if there is one, else the dialog itself
    const root = panel.current;
    if (root) {
      const pick = root.querySelector<HTMLElement>('[data-autofocus], [autofocus]') ?? root.querySelector<HTMLElement>('.olw-body input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), .olw-body textarea');
      (pick ?? root).focus({ preventScroll: true });
    }
    return () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      if (!stack.length) listen(false);
      if (!entry.popped) {
        // closed by a button: take our entry off the history without closing anything else
        try {
          if ((history.state as { olwDialog?: string } | null)?.olwDialog) {
            ignorePops++;
            history.back();
          }
        } catch {
          /* ignore */
        }
      }
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [titleId]);

  return { panel, titleId };
}

/** Clicks that start and end on the backdrop close the dialog; a drag that ends there (selecting text) does not. */
export function useBackdropClose(onClose: () => void) {
  const down = useRef(false);
  return {
    onMouseDown: (e: React.MouseEvent) => { down.current = e.target === e.currentTarget; },
    onClick: (e: React.MouseEvent) => { if (e.target === e.currentTarget && down.current) onClose(); },
  };
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export default function Sheet({ title, onClose, children, wide, size }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; size?: SheetSize }) {
  const { panel, titleId } = useDialog(onClose);
  const backdrop = useBackdropClose(onClose);
  const size_: SheetSize = size ?? (wide ? 'lg' : 'md');
  return (
    <div className="olw-backdrop absolute inset-0 z-30 flex items-end justify-center bg-cocoa/30 backdrop-blur-sm sm:items-center sm:p-6" {...backdrop}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`olw-dialog flex max-h-[92%] w-full flex-col rounded-t-3xl bg-cream p-5 shadow-2xl outline-none sm:max-h-[88vh] sm:rounded-3xl sm:p-6 ${WIDTH[size_]}`}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <h2 id={titleId} className="font-display text-xl font-bold text-cocoa sm:text-2xl">{title}</h2>
          <CloseButton onClose={onClose} />
        </div>
        <div className="olw-body -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 text-[15px] sm:text-base xl:text-[17px]">{children}</div>
      </div>
    </div>
  );
}

export function CloseButton({ onClose }: { onClose: () => void }) {
  return <button onClick={onClose} className="shrink-0 cursor-pointer rounded-full bg-blush px-3 py-1 font-bold text-cocoa transition hover:brightness-95 active:scale-95" aria-label="Close" title="Close (Esc)">✕</button>;
}

/** Enter runs the primary action (Shift plus Enter keeps a new line in notes); ignores IME composition and incomplete forms. */
export const onEnter = (run: () => void, ok = true) => (e: React.KeyboardEvent) => {
  if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
  e.preventDefault();
  if (ok) run();
};

export const primaryBtn = 'cursor-pointer rounded-full bg-pink-400 px-5 py-2 font-display font-bold text-white shadow transition hover:bg-pink-500 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-pink-400';
export const softBtn = 'cursor-pointer rounded-full bg-blush px-4 py-2 font-display font-bold text-cocoa transition hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40';
export const fieldCls = 'w-full rounded-xl border-2 border-blush bg-white px-3 py-2 text-cocoa outline-none transition hover:border-pink-300 focus:border-pink-400';
