import type { ReactNode } from 'react';

/** Bottom sheet on phones, centered card on larger screens. */
export default function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-cocoa/30 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`max-h-[92%] w-full overflow-y-auto rounded-t-3xl bg-cream p-5 shadow-2xl sm:rounded-3xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-cocoa">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-blush px-3 py-1 font-bold text-cocoa" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const primaryBtn = 'rounded-full bg-pink-400 px-5 py-2 font-display font-bold text-white shadow active:scale-95 disabled:opacity-40';
export const softBtn = 'rounded-full bg-blush px-4 py-2 font-display font-bold text-cocoa active:scale-95';
export const fieldCls = 'w-full rounded-xl border-2 border-blush bg-white px-3 py-2 text-cocoa outline-none focus:border-pink-400';
