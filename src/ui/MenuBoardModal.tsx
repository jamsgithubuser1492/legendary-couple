import { useState } from 'react';
import { labSetMenu, labSetSpotlight, useGameState } from '../state/store';
import { labTipBonus, menuSlots, recipesOf, TIER_NAMES } from '../state/lab';
import MenuBoard from './lab/MenuBoard';
import { chipKeyFor, LabImg, stars } from './lab/labArt';
import Sheet, { primaryBtn, softBtn } from './Sheet';

/** The café's menu board: six slots for your own drinks. Guests order what is on it, and the Spotlight drink gets ordered the most. */
export default function MenuBoardModal({ onClose, onBook }: { onClose: () => void; onBook?: () => void }) {
  const s = useGameState();
  const [slot, setSlot] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const slots = menuSlots(s);
  const recipes = recipesOf(s).sort((a, b) => b.quality - a.quality || a.name.localeCompare(b.name));
  const bonus = Math.round(labTipBonus(s) * 100);
  const spot = s.cafe.lab?.spotlight ?? null;
  const here = slot !== null ? slots[slot] : null;
  const say = (r: { ok: boolean; reason?: string; text?: string }) => setMsg(r.ok ? r.text ?? '' : r.reason ?? '');
  return (
    <Sheet title="Menu board 🪧" onClose={onClose} size="lg">
      <div className="text-cocoa">
        <MenuBoard s={s} picked={slot} onSlot={(i) => { setSlot(slot === i ? null : i); setMsg(''); }} />
        <p className="mt-2 text-center text-sm text-cocoa/80">
          {recipes.length === 0
            ? 'Invent your first drink in the Test Kitchen, then pin it here.'
            : bonus > 0 ? `Your board makes guests tip about ${bonus} percent more, and they order what is on it.` : 'Guests order what is on the board. Seasonal and Signature drinks add a little extra to tips.'}
        </p>
        {slot === null ? (
          <p className="mt-3 text-center text-xs text-cocoa/60">Tap a slot to choose its drink.</p>
        ) : (
          <div className="mt-3 rounded-2xl bg-white p-3 shadow">
            <div className="flex items-center justify-between gap-2">
              <div className="font-display font-bold">Slot {slot + 1}{here ? `: ${here.name}` : ' is empty'}</div>
              <div className="flex gap-2">
                {here && <button className={`${softBtn} !px-3 !py-1 text-xs`} onClick={() => say(labSetSpotlight(spot === here.id ? null : here.id))}>{spot === here.id ? 'Remove the star' : '⭐ Make it the Spotlight'}</button>}
                {here && <button className={`${softBtn} !px-3 !py-1 text-xs`} onClick={() => { say(labSetMenu(slot, null)); }}>Clear</button>}
              </div>
            </div>
            {recipes.length === 0 ? <p className="mt-2 text-xs text-cocoa/70">No recipes yet.</p> : (
              <ul className="mt-2 grid max-h-56 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {recipes.map((r) => {
                  const where = slots.findIndex((x) => x?.id === r.id);
                  return (
                    <li key={r.id}>
                      <button className="flex w-full cursor-pointer items-center gap-2 rounded-xl bg-cream p-2 text-left transition hover:bg-pink-50 active:scale-[0.99]" onClick={() => say(labSetMenu(slot, r.id))} title={where >= 0 ? `Moves it from slot ${where + 1}` : 'Put it in this slot'}>
                        <LabImg k={chipKeyFor(r.tier)} className="w-6" />
                        <span className="min-w-0 flex-1"><span className="block truncate font-display text-sm font-bold">{r.name}</span><span className="text-[11px] text-cocoa/60">{TIER_NAMES[r.tier]} · {stars(r.quality)}{where >= 0 ? ` · on slot ${where + 1}` : ''}</span></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        <div className="mt-2 min-h-[18px] text-center text-xs font-bold text-pink-600" aria-live="polite">{msg}</div>
        <div className="mt-2 flex justify-center gap-2">
          {onBook && <button className={primaryBtn} onClick={onBook}>Recipe book 📖</button>}
          <button className={softBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </Sheet>
  );
}
