import { useState } from 'react';
import type { Quest } from '../types';
import { createMemory, deleteMemory, useGameState, useMe } from '../state/store';
import { BUS, gameBus } from '../game/events';
import { shrinkImage } from './imageUtil';

const field = 'w-full rounded-xl border-2 border-blush bg-white px-3 py-2 text-cocoa outline-none focus:border-pink-400';
const primary = 'rounded-full bg-pink-400 px-5 py-2 font-display font-bold text-white shadow active:scale-95 disabled:opacity-40';
const soft = 'rounded-full bg-blush px-4 py-2 font-display font-bold text-cocoa active:scale-95';
const fmt = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function NewMemory({ prefill, onDone }: { prefill?: Quest; onDone: () => void }) {
  const me = useMe();
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [full, setFull] = useState(false);
  return (
    <div className="rounded-2xl bg-white p-3 shadow">
      <input className={field} placeholder="What do you want to remember?" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={`${field} mt-2`} rows={2} placeholder="A note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-2 flex items-center gap-3">
        <label className={`${soft} cursor-pointer`}>
          📷 Add photo
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await shrinkImage(f, 560)); }} />
        </label>
        {photo && <img src={photo} alt="memory" className="h-16 w-16 rounded-xl object-cover" />}
      </div>
      {full && <p className="mt-2 text-xs text-red-500">The shoreline is full. Remove a memory plaque or an object first.</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button className={soft} onClick={onDone}>Cancel</button>
        <button
          className={primary}
          disabled={!title.trim()}
          onClick={() => {
            const m = createMemory({ title, note, photo, author: me, questId: prefill?.id });
            if (!m) return setFull(true);
            onDone();
            gameBus.emit(BUS.focus, { x: m.tileX, y: m.tileY });
          }}
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

  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-cocoa/20" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-cream shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="font-display text-2xl font-bold text-cocoa">Memory Journal 📔</h2>
          <button onClick={onClose} className="rounded-full bg-blush px-3 py-1 font-bold text-cocoa" aria-label="Close">✕</button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          {adding ? (
            <NewMemory prefill={pre} onDone={() => { setAdding(false); setPre(undefined); }} />
          ) : (
            <button className={`${primary} w-full`} onClick={() => setAdding(true)}>＋ New memory</button>
          )}
          {!adding && waiting.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3">
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
          {s.memories.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-2xl bg-white shadow">
              {m.photo && <img src={m.photo} alt={m.title} className="max-h-48 w-full cursor-pointer object-cover" onClick={() => onView(m.id)} />}
              <div className="p-3">
                <div className="font-display font-bold text-cocoa">{m.title}</div>
                <div className="text-xs text-cocoa/60">{fmt(m.date)} · {s.names[m.author]}</div>
                {m.note && <p className="mt-1 text-sm text-cocoa/80">{m.note}</p>}
                <div className="mt-2 flex justify-end gap-2">
                  <button className={soft} onClick={() => { gameBus.emit(BUS.focus, { x: m.tileX, y: m.tileY }); onClose(); }}>📍 Show on island</button>
                  <button className="px-2 text-cocoa/40" aria-label="Delete memory" onClick={() => deleteMemory(m.id)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MemoryViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useGameState();
  const m = s.memories.find((x) => x.id === id);
  if (!m) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-cocoa/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-cream p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {m.photo ? (
          <img src={m.photo} alt={m.title} className="w-full rounded-2xl" />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-2xl bg-blush text-5xl">💕</div>
        )}
        <h2 className="mt-3 font-display text-2xl font-bold text-cocoa">{m.title}</h2>
        <p className="text-xs text-cocoa/60">{fmt(m.date)} · saved by {s.names[m.author]}</p>
        {m.note && <p className="mt-2 text-cocoa">{m.note}</p>}
        <button className={`${primary} mt-4 w-full`} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
