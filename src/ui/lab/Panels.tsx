import { useMemo, useState } from 'react';
import type { GameState } from '../../types';
import { GLASSES, INGREDIENTS, RIM_IDS, ART_IDS, isAvailable, isUnlocked, type Ingredient, type IngredientKind } from '../../state/lab';
import { SpriteImg } from '../ItemIcon';
import { SweetDial, SpotMeter, Thermometer } from './Controls';
import { closeOf, sweetHint, tempHint, type Draft } from './draft';
import { GLASS_KEY, Jar, LabImg, PATTERN_NAME, PAINTED_ART, RIM_KEY, RIM_NAME } from './labArt';
import TracePad from './TracePad';

const KIND_TITLE: Record<IngredientKind, string> = { base: 'Base', flavor: 'Flavor', topping: 'Topping' };
const STARTERS = new Set(INGREDIENTS.filter((i) => i.hint === 'Ready from the start').map((i) => i.id));

/** One ingredient on the shelf: its jar, its name, and a gentle note when it is closed or out of season. */
function JarButton({ ing, s, picked, onPick, fresh, disabled }: { ing: Ingredient; s: GameState; picked: boolean; onPick: () => void; fresh: boolean; disabled?: boolean }) {
  const open = isUnlocked(s, ing.id);
  const inSeason = isAvailable(s, ing.id);
  const usable = open && inSeason;
  const note = !open ? ing.hint : !inSeason ? 'Out of season right now. It comes back in its own season.' : ing.name;
  return (
    <button
      type="button"
      onClick={usable && !disabled ? onPick : undefined}
      aria-pressed={picked}
      aria-disabled={!usable}
      aria-label={`${ing.name}${!open ? ', closed' : !inSeason ? ', out of season' : ''}`}
      title={note}
      className={`relative flex w-[68px] shrink-0 flex-col items-center rounded-2xl px-1 pb-1 pt-1.5 text-center transition ${picked ? 'bg-pink-100 ring-2 ring-pink-400' : 'bg-white/90 hover:bg-white'} ${usable ? 'cursor-pointer active:scale-95' : 'cursor-help'} shadow`}
    >
      <div className={`relative flex h-12 items-end justify-center ${usable ? '' : 'opacity-45 saturate-50'}`}>
        <Jar id={ing.id} h={44} />
      </div>
      <span className="mt-0.5 line-clamp-2 min-h-[24px] text-[10px] font-bold leading-tight text-cocoa">{ing.name}</span>
      {!open && <span className="absolute right-0.5 top-0.5 text-xs" aria-hidden>🔒</span>}
      {open && !inSeason && <span className="absolute right-0.5 top-0.5 text-xs" aria-hidden>🌿</span>}
      {fresh && usable && <span className="olw-new absolute -right-1 -top-1 rounded-full bg-pink-400 px-1.5 text-[9px] font-bold text-white shadow">New</span>}
    </button>
  );
}

/** Partner one's side of the counter: choose the three ingredients and tune the temperature and sweetness by feel. */
export function AlchemistPanel({ s, draft, set, disabled, seen, note }: { s: GameState; draft: Draft; set: (p: Partial<Draft>) => void; disabled?: boolean; seen: string[]; note?: string }) {
  const close = closeOf(draft);
  const [hint, setHint] = useState(false);
  const kinds: IngredientKind[] = ['base', 'flavor', 'topping'];
  return (
    <section className="rounded-3xl bg-cream/95 p-3 shadow-lg" aria-label="Flavor Alchemist">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-cocoa">Flavor Alchemist 🧪</h3>
        {note && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-cocoa/70">{note}</span>}
      </div>
      <p className="text-xs text-cocoa/70">Pick a base, a flavor and a topping. Then find the balance that tastes best.</p>
      {kinds.map((k) => (
        <div key={k} className="mt-2">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-cocoa/60">{KIND_TITLE[k]}</div>
          <div className="flex flex-wrap gap-1.5">
            {INGREDIENTS.filter((i) => i.kind === k).map((i) => (
              <JarButton key={i.id} ing={i} s={s} picked={draft[k] === i.id} disabled={disabled} fresh={!STARTERS.has(i.id) && !seen.includes(i.id)} onPick={() => set({ [k]: i.id } as Partial<Draft>)} />
            ))}
          </div>
        </div>
      ))}
      <div className="mt-2 flex items-end justify-around gap-2 rounded-2xl bg-white/80 p-2">
        <div className="text-center">
          <Thermometer value={draft.temp} onChange={(v) => set({ temp: v })} disabled={disabled} />
          {hint && <div className="mt-0.5 text-[11px] font-bold text-pink-600">{tempHint(draft)}</div>}
        </div>
        <div className="flex flex-col items-center gap-2">
          <SpotMeter close={close} chimeKey={`${draft.base}|${draft.flavor}|${draft.topping}`} />
          <button type="button" className="rounded-full bg-blush px-3 py-1 text-xs font-bold text-cocoa transition hover:brightness-95 active:scale-95" onClick={() => setHint(true)} title="Take a small sip for a hint">👅 Taste for a hint</button>
          <div className="text-center text-[11px] text-cocoa/70" aria-live="polite">{hint ? (close >= 0.9 ? 'Right on the sweet spot!' : `${Math.round(close * 100)}% of the way there`) : 'The arc glows when you are close.'}</div>
        </div>
        <div className="text-center">
          <SweetDial value={draft.sweet} onChange={(v) => set({ sweet: v })} disabled={disabled} />
          {hint && <div className="mt-0.5 text-[11px] font-bold text-pink-600">{sweetHint(draft)}</div>}
        </div>
      </div>
    </section>
  );
}

/** Partner two's side: glass, rim garnish and the latte art pour. */
export function DecoratorPanel({ draft, set, disabled, note }: { draft: Draft; set: (p: Partial<Draft>) => void; disabled?: boolean; note?: string }) {
  const arts = useMemo(() => ART_IDS, []);
  const chip = (on: boolean) => `relative flex shrink-0 cursor-pointer flex-col items-center rounded-2xl px-1.5 py-1 text-center transition active:scale-95 ${on ? 'bg-pink-100 ring-2 ring-pink-400' : 'bg-white/90 hover:bg-white'} shadow`;
  return (
    <section className="rounded-3xl bg-cream/95 p-3 shadow-lg" aria-label="Visual Decorator">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-cocoa">Visual Decorator 🎨</h3>
        {note && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-cocoa/70">{note}</span>}
      </div>
      <p className="text-xs text-cocoa/70">Choose a glass and a garnish, then pour some latte art on top.</p>
      <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-cocoa/60">Glass</div>
      <div className="flex gap-1.5">
        {GLASSES.map((g) => (
          <button key={g.id} type="button" disabled={disabled} className={chip(draft.glass === g.id)} aria-pressed={draft.glass === g.id} aria-label={g.name} title={g.name} onClick={() => set({ glass: g.id })}>
            <LabImg k={GLASS_KEY[g.id]} style={{ height: 52, width: 'auto' }} className="max-w-none object-contain" alt={g.name} />
            <span className="text-[10px] font-bold text-cocoa">{g.name.replace('Pastel to go cup', 'To-go cup')}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-cocoa/60">Garnish</div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={disabled} className={`${chip(draft.rim === null)} w-[58px] justify-center`} aria-pressed={draft.rim === null} aria-label="No garnish" onClick={() => set({ rim: null })}><span className="text-lg">∅</span><span className="text-[10px] font-bold text-cocoa">None</span></button>
        {RIM_IDS.map((r) => (
          <button key={r} type="button" disabled={disabled} className={`${chip(draft.rim === r)} w-[58px]`} aria-pressed={draft.rim === r} aria-label={RIM_NAME[r]} title={RIM_NAME[r]} onClick={() => set({ rim: r })}>
            <LabImg k={RIM_KEY[r]} style={{ height: 30, width: 'auto', maxWidth: 46 }} className="object-contain" alt={RIM_NAME[r]} fallback={<span className="text-xl">✨</span>} />
            <span className="mt-0.5 line-clamp-1 text-[10px] font-bold text-cocoa">{RIM_NAME[r].split(' ')[0]}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-cocoa/60">Latte art</div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={disabled} className={`${chip(draft.art === null)} w-[58px] justify-center`} aria-pressed={draft.art === null} aria-label="Plain, no latte art" onClick={() => set({ art: null, artScore: 0.5 })}><span className="text-lg">∅</span><span className="text-[10px] font-bold text-cocoa">Plain</span></button>
        {arts.map((a) => (
          <button key={a} type="button" disabled={disabled} className={`${chip(draft.art === a)} w-[58px]`} aria-pressed={draft.art === a} aria-label={`${PATTERN_NAME[a]} latte art`} title={PATTERN_NAME[a]} onClick={() => set({ art: a, artScore: 0 })}>
            {PAINTED_ART.includes(a) ? <LabImg k={`labx_art_latte_${a}`} style={{ height: 30 }} className="max-w-none object-contain" alt="" /> : <SpriteImg sprite={`cy_stencil_${a}`} size={30} />}
            <span className="mt-0.5 text-[10px] font-bold text-cocoa">{PATTERN_NAME[a].split(' ')[0]}</span>
          </button>
        ))}
      </div>
      {draft.art && (
        <div className="mt-2">
          <TracePad pattern={draft.art} base={draft.base} disabled={disabled} score={draft.artScore > 0 ? draft.artScore : null} onScore={(v) => set({ artScore: v })} />
        </div>
      )}
    </section>
  );
}
