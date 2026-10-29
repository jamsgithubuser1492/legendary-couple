import { useState } from 'react';
import { labLinkMemory, labNameRecipe, labSetMenu, useGameState } from '../../state/store';
import { LAB_NAME_IDEAS, MAX_NAME, menuSlots, validateName } from '../../state/lab';
import { onEnter } from '../Sheet';
import { LabImg } from './labArt';
import RecipeCard from './RecipeCard';

/** After a new drink: its card, a naming plaque with ideas tied to real memories, and a shortcut to the menu board. */
export default function NameStep({ recipeId, headline, onDone, celebrate }: { recipeId: string; headline: string; onDone: () => void; celebrate: boolean }) {
  const s = useGameState();
  const r = s.cafe.lab?.recipes?.[recipeId];
  const [name, setName] = useState(r?.name ?? '');
  const [msg, setMsg] = useState('');
  const [memory, setMemory] = useState(r?.memoryId ?? '');
  const [onMenu, setOnMenu] = useState('');
  if (!r) return <p className="p-4 text-center text-sm text-cocoa/70">Your new drink is arriving in the book&hellip;</p>;
  const check = validateName(name, s, r.id);
  const save = () => {
    if (name.trim() !== r.name) {
      const res = labNameRecipe(r.id, name);
      if (!res.ok) { setMsg(res.reason ?? 'Try another name.'); return; }
    }
    if (memory && memory !== r.memoryId) labLinkMemory(r.id, memory);
    onDone();
  };
  const slots = menuSlots(s);
  const free = slots.findIndex((x) => !x);
  const onBoard = slots.some((x) => x?.id === r.id);
  return (
    <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
      <div className="mx-auto"><RecipeCard r={r} width={160} celebrate={celebrate} /></div>
      <div className="text-cocoa">
        <div className="font-display text-xl font-bold">{headline}</div>
        <p className="text-sm text-cocoa/70">Name it after something real. A name makes a drink a memory.</p>
        <div className="relative mt-2" style={{ maxWidth: 360 }}>
          <LabImg k="labx_card_plaque" className="w-full" fallback={<div className="h-12 rounded-xl bg-[#7a5238]" />} />
          <input
            value={name} maxLength={MAX_NAME + 6} onChange={(e) => { setName(e.target.value); setMsg(''); }} onKeyDown={onEnter(save, check.ok)}
            aria-label="Drink name" data-autofocus placeholder="Name your drink"
            className="absolute inset-x-[9%] top-[22%] h-[52%] rounded-md bg-[#f6e8d0] px-2 text-center font-display text-sm font-bold text-cocoa outline-none ring-pink-300 focus:ring-2"
          />
        </div>
        <div className="mt-1 text-[11px] text-cocoa/60" aria-live="polite">{msg || (!check.ok && name.trim() ? check.reason : `${name.trim().length} of ${MAX_NAME} letters`)}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {LAB_NAME_IDEAS.map((n) => (
            <button key={n} type="button" onClick={() => setName(n.slice(0, MAX_NAME))} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-cocoa shadow transition hover:bg-pink-50 active:scale-95" title="Use this idea">{n}</button>
          ))}
        </div>
        {s.memories.length > 0 && (
          <label className="mt-3 block text-xs font-bold text-cocoa/70">
            Named after a memory (optional)
            <select value={memory} onChange={(e) => setMemory(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-blush bg-white px-2 py-1.5 text-sm font-normal text-cocoa">
              <option value="">No memory</option>
              {s.memories.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </label>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="cursor-pointer rounded-full bg-pink-400 px-5 py-2 font-display font-bold text-white shadow transition hover:bg-pink-500 active:scale-95 disabled:opacity-40" disabled={!check.ok && name.trim() !== r.name} onClick={save}>Save name</button>
          <button className="cursor-pointer rounded-full bg-blush px-4 py-2 font-display font-bold text-cocoa transition hover:brightness-95 active:scale-95" onClick={onDone}>Skip for now</button>
          <button
            className="cursor-pointer rounded-full bg-white px-4 py-2 font-display text-sm font-bold text-cocoa shadow transition hover:bg-pink-50 active:scale-95 disabled:opacity-40"
            disabled={onBoard} title={free < 0 ? 'The board is full. Open the menu board to swap a drink.' : 'Guests will start ordering it'}
            onClick={() => { if (free < 0) { setOnMenu('The board is full. Open the menu board to swap one.'); return; } const x = labSetMenu(free, r.id); setOnMenu(x.ok ? 'On the menu board!' : x.reason ?? ''); }}
          >{onBoard ? 'On the board ✓' : 'Put it on the menu'}</button>
        </div>
        {onMenu && <div className="mt-1 text-xs font-bold text-pink-600" aria-live="polite">{onMenu}</div>}
      </div>
    </div>
  );
}
