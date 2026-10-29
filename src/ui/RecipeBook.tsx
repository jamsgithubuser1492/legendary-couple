import { useMemo, useState } from 'react';
import { labLinkMemory, labNameRecipe, labSetMenu, useGameState } from '../state/store';
import { ingredientOf, labProgress, MAX_NAME, menuSlots, recipesOf, seasonOfRecipe, TIER_BLURB, TIER_NAMES, validateName } from '../state/lab';
import type { LabTier } from '../types';
import RecipeCard from './lab/RecipeCard';
import { PATTERN_NAME, RIM_NAME, stars } from './lab/labArt';
import Sheet, { onEnter, primaryBtn, softBtn } from './Sheet';

const TIERS: (LabTier | 'all')[] = ['all', 'classic', 'seasonal', 'signature'];
const SEASONS = ['all', 'spring', 'summer', 'autumn', 'winter'] as const;

/** The Shared Recipe Memory Book: every drink you have discovered together, as cards. */
export default function RecipeBook({ onClose, onBoard }: { onClose: () => void; onBoard?: () => void }) {
  const s = useGameState();
  const [tier, setTier] = useState<LabTier | 'all'>('all');
  const [season, setSeason] = useState<(typeof SEASONS)[number]>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const all = recipesOf(s);
  const shown = useMemo(() => all.filter((r) => (tier === 'all' || r.tier === tier) && (season === 'all' || seasonOfRecipe(r) === season)).sort((a, b) => b.quality - a.quality || a.name.localeCompare(b.name)), [all, tier, season]);
  const r = open ? s.cafe.lab?.recipes?.[open] : null;
  const prog = labProgress(s);
  const slots = menuSlots(s);
  const free = slots.findIndex((x) => !x);
  const chip = (on: boolean) => `cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${on ? 'bg-pink-400 text-white' : 'bg-white text-cocoa hover:bg-pink-50'} shadow`;
  const rename = () => {
    if (!r) return;
    const res = labNameRecipe(r.id, name);
    setMsg(res.ok ? res.text ?? '' : res.reason ?? '');
  };
  return (
    <Sheet title="Recipe memory book 📖" onClose={onClose} size="xl">
      <div className="text-cocoa">
        <p className="text-sm text-cocoa/80">{all.length} {all.length === 1 ? 'drink' : 'drinks'} found together · {prog.byTier.classic} Classic · {prog.byTier.seasonal} Seasonal · {prog.byTier.signature} Signature</p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filters">
          {TIERS.map((t) => <button key={t} className={chip(tier === t)} aria-pressed={tier === t} onClick={() => setTier(t)}>{t === 'all' ? 'All drinks' : TIER_NAMES[t]}</button>)}
          <span className="mx-1 w-px bg-cocoa/20" />
          {SEASONS.map((x) => <button key={x} className={chip(season === x)} aria-pressed={season === x} onClick={() => setSeason(x)}>{x === 'all' ? 'Any season' : x[0].toUpperCase() + x.slice(1)}</button>)}
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            {all.length === 0 ? (
              <div className="mx-auto flex h-56 max-w-xs flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cocoa/30 p-4 text-center">
                <div className="text-4xl" aria-hidden>☕</div>
                <p className="mt-2 font-display font-bold">Your book is waiting for its first page.</p>
                <p className="text-xs text-cocoa/70">Invent a drink together in the Test Kitchen, and it will be kept here.</p>
              </div>
            ) : shown.length === 0 ? (
              <p className="p-6 text-center text-sm text-cocoa/70">No drinks match that filter. Try another.</p>
            ) : (
              <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {shown.map((x) => <RecipeCard key={x.id} r={x} width={140} selected={open === x.id} onClick={() => { setOpen(x.id); setName(x.name); setMsg(''); }} />)}
              </div>
            )}
          </div>
          <aside className="rounded-2xl bg-white p-3 shadow lg:self-start" aria-live="polite">
            {!r ? <p className="text-center text-sm text-cocoa/70">Tap a card to read about the drink.</p> : (
              <div className="space-y-2 text-sm">
                <div className="font-display text-lg font-bold leading-tight">{r.name}</div>
                <div className="text-xs text-cocoa/70">{TIER_NAMES[r.tier]} · {stars(r.quality)} · {TIER_BLURB[r.tier]}</div>
                <ul className="text-xs text-cocoa/80">
                  <li>Base: <b>{ingredientOf(r.base)?.name}</b></li>
                  <li>Flavor: <b>{ingredientOf(r.flavor)?.name}</b></li>
                  <li>Topping: <b>{ingredientOf(r.topping)?.name}</b></li>
                  <li>Glass: <b>{r.glass === 'togo' ? 'To-go cup' : r.glass === 'mug' ? 'Character mug' : 'Mason jar'}</b>{r.rim ? ` · ${RIM_NAME[r.rim] ?? r.rim}` : ''}{r.art ? ` · ${PATTERN_NAME[r.art] ?? r.art} art` : ''}</li>
                  <li>Found by <b>{r.by === 'A' ? s.names.A : r.by === 'B' ? s.names.B : r.by}</b> on {r.day}</li>
                  {r.memoryId && <li>Named after: <b>{s.memories.find((m) => m.id === r.memoryId)?.title ?? 'a memory'}</b></li>}
                </ul>
                <div className="flex gap-1.5">
                  <input value={name} maxLength={MAX_NAME + 6} onChange={(e) => { setName(e.target.value); setMsg(''); }} onKeyDown={onEnter(rename, validateName(name, s, r.id).ok)} aria-label="Rename the drink" className="min-w-0 flex-1 rounded-xl border-2 border-blush bg-cream px-2 py-1 text-sm" />
                  <button className={`${softBtn} !px-3 !py-1 text-xs`} disabled={name.trim() === r.name || !validateName(name, s, r.id).ok} onClick={rename}>Rename</button>
                </div>
                {s.memories.length > 0 && (
                  <select value={r.memoryId ?? ''} onChange={(e) => e.target.value && labLinkMemory(r.id, e.target.value)} aria-label="Named after a memory" className="w-full rounded-xl border-2 border-blush bg-cream px-2 py-1 text-xs">
                    <option value="">Link a memory</option>
                    {s.memories.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                )}
                <button className={`${primaryBtn} w-full !py-1.5 text-sm`} disabled={slots.some((x) => x?.id === r.id) || free < 0} title={free < 0 ? 'The board is full. Open the menu board to swap.' : undefined} onClick={() => { const x = labSetMenu(free, r.id); setMsg(x.ok ? 'On the menu board!' : x.reason ?? ''); }}>
                  {slots.some((x) => x?.id === r.id) ? 'On the menu board ✓' : 'Put it on the menu'}
                </button>
                <div className="min-h-[16px] text-xs font-bold text-pink-600">{msg}</div>
              </div>
            )}
          </aside>
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {onBoard && <button className={softBtn} onClick={onBoard}>Menu board 🪧</button>}
          <button className={primaryBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </Sheet>
  );
}
