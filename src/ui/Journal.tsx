import { useState } from 'react';
import type { Quest } from '../types';
import { createMemory, deleteMemory, useGameState, useMe } from '../state/store';
import { BUS, gameBus } from '../game/events';
import PhotoPicker from './PhotoPicker';
import { CloseButton, fieldCls, onEnter, primaryBtn, softBtn, useBackdropClose, useDialog } from './Sheet';

const field = fieldCls;
const primary = primaryBtn;
const soft = softBtn;
const fmt = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function NewMemory({ prefill, onDone }: { prefill?: Quest; onDone: () => void }) {
  const me = useMe();
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [full, setFull] = useState(false);
  const save = () => {
    if (!title.trim()) return;
    const m = createMemory({ title, note, photo, author: me, questId: prefill?.id });
    if (!m) return setFull(true);
    onDone();
    gameBus.emit(BUS.focus, { x: m.tileX, y: m.tileY });
  };
  return (
    <div className="rounded-2xl bg-white p-3 shadow">
      <input className={field} placeholder="What do you want to remember?" aria-label="What do you want to remember" data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onEnter(save, !!title.trim())} />
      <textarea className={`${field} mt-2`} rows={2} placeholder="A note (optional)" aria-label="A note" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter(save, !!title.trim())} />
      <div className="mt-2"><PhotoPicker value={photo} onChange={setPhoto} max={560} alt="memory" /></div>
      {full && <p className="mt-2 text-xs text-red-500">The shoreline is full. Remove a memory plaque or an object first.</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button className={soft} onClick={onDone}>Cancel</button>
        <button
          className={primary}
          disabled={!title.trim()}
          onClick={save}
        >
          Save and place plaque
        </button>
      </div>
    </div>
  );
}

export default function Journal({ prefill, onClose, onView }: { prefill?: Quest; onClose: () => void; onView: (id: string) => void }) {
  const s = useGameState();
  const [adding, setAdding] = useState(!!prefill);
  const waiting = s.quests.filter((q) => q.status === 'APPROVED' && q.milestone && !s.memories.some((m) => m.questId === q.id));
  const [pre, setPre] = useState<Quest | undefined>(prefill);
  const { panel, titleId } = useDialog(onClose);
  const backdrop = useBackdropClose(onClose);

  // a side drawer on a phone, a centered dialog on a desktop window with the memories as a grid of cards
  return (
    <div className="olw-backdrop absolute inset-0 z-20 flex justify-end bg-cocoa/20 sm:items-center sm:justify-center sm:bg-cocoa/30 sm:p-6 sm:backdrop-blur-sm" {...backdrop}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="olw-dialog flex h-full w-full max-w-md flex-col bg-cream shadow-2xl outline-none sm:h-auto sm:max-h-[88vh] sm:max-w-[1100px] sm:rounded-3xl sm:p-2">
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 id={titleId} className="font-display text-2xl font-bold text-cocoa">Memory Journal 📔</h2>
          <CloseButton onClose={onClose} />
        </div>
        <div className="olw-body min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4">
          <div className="sm:mx-auto sm:max-w-2xl">
            {adding ? (
              <NewMemory prefill={pre} onDone={() => { setAdding(false); setPre(undefined); }} />
            ) : (
              <button className={`${primary} w-full`} onClick={() => setAdding(true)}>＋ New memory</button>
            )}
          </div>
          {!adding && waiting.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3 sm:mx-auto sm:max-w-2xl">
              <p className="font-display font-bold text-cocoa">Milestones ready for a memory ✨</p>
              {waiting.map((q) => (
                <div key={q.id} className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white/80 p-2">
                  <span className="text-sm text-cocoa">{q.title}</span>
                  <button className={soft} onClick={() => { setPre(q); setAdding(true); }}>Capture</button>
                </div>
              ))}
            </div>
          )}
          {s.memories.length === 0 && !adding && (
            <p className="py-8 text-center text-cocoa/60">No memories yet. Complete a milestone, then plant a plaque on your island. 🌴</p>
          )}
          <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
            {s.memories.map((m) => (
              <div key={m.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow transition hover:shadow-md">
                {m.photo && <button className="block cursor-zoom-in" onClick={() => onView(m.id)} aria-label={`View ${m.title}`}><img src={m.photo} alt={m.title} className="max-h-48 w-full object-cover sm:h-44" /></button>}
                <div className="flex flex-1 flex-col p-3">
                  <div className="font-display font-bold text-cocoa">{m.title}</div>
                  <div className="text-xs text-cocoa/60">{fmt(m.date)} · {s.names[m.author]}</div>
                  {m.note && <p className="mt-1 text-sm text-cocoa/80">{m.note}</p>}
                  <div className="mt-auto flex justify-end gap-2 pt-2">
                    <button className={soft} onClick={() => { gameBus.emit(BUS.focus, { x: m.tileX, y: m.tileY }); onClose(); }}>📍 Show on island</button>
                    <button className="cursor-pointer px-2 text-cocoa/40 transition hover:text-red-500" aria-label="Delete memory" title="Delete memory" onClick={() => deleteMemory(m.id)}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MemoryViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useGameState();
  const m = s.memories.find((x) => x.id === id);
  const { panel, titleId } = useDialog(onClose);
  const backdrop = useBackdropClose(onClose);
  if (!m) return null;
  return (
    <div className="olw-backdrop absolute inset-0 z-30 flex items-center justify-center bg-cocoa/40 p-4 backdrop-blur-sm" {...backdrop}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="olw-dialog max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-cream p-4 shadow-2xl outline-none sm:max-w-2xl sm:p-6">
        {m.photo ? (
          <img src={m.photo} alt={m.title} className="max-h-[60vh] w-full rounded-2xl object-contain" />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-2xl bg-blush text-5xl">💕</div>
        )}
        <h2 id={titleId} className="mt-3 font-display text-2xl font-bold text-cocoa">{m.title}</h2>
        <p className="text-xs text-cocoa/60">{fmt(m.date)} · saved by {s.names[m.author]}</p>
        {m.note && <p className="mt-2 text-cocoa">{m.note}</p>}
        <button className={`${primary} mt-4 w-full`} data-autofocus onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
