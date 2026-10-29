import type { GameState, LabRecipe } from '../../types';
import { menuSlots, MENU_SLOTS } from '../../state/lab';
import { Vessel } from './Vessel';
import { LabImg, PAINTED_ART, stars } from './labArt';

const asDraft = (r: LabRecipe) => ({ base: r.base, flavor: r.flavor, topping: r.topping, glass: r.glass, rim: r.rim, art: r.art, artScore: 1, temp: 0.5, sweet: 0.5 });

/**
 * The menu board: the painted frame with six slots laid over its open middle. An empty slot is a dotted frame with a plus,
 * a filled one shows the drink and its name, and the Spotlight drink wears a star.
 */
export default function MenuBoard({ s, picked, onSlot, compact }: { s: GameState; picked: number | null; onSlot?: (i: number) => void; compact?: boolean }) {
  const slots = menuSlots(s);
  const spot = s.cafe.lab?.spotlight ?? null;
  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: compact ? 360 : 560, aspectRatio: '495 / 244' }}>
      <LabImg k="labx_menu_frame_base" className="absolute inset-0 h-full w-full object-fill" fallback={<div className="absolute inset-0 rounded-2xl bg-[#5b3d2e] ring-4 ring-[#8a6340]" />} />
      <div className="absolute grid grid-cols-3 gap-1.5" style={{ left: '7%', right: '7%', top: '24%', bottom: '19%' }}>
        {Array.from({ length: MENU_SLOTS }, (_, i) => {
          const r = slots[i];
          const on = picked === i;
          return (
            <button
              key={i} type="button" onClick={onSlot ? () => onSlot(i) : undefined} disabled={!onSlot}
              aria-label={r ? `Slot ${i + 1}: ${r.name}${r.id === spot ? ', the Spotlight drink' : ''}` : `Slot ${i + 1}: empty`} aria-pressed={on}
              className={`relative flex min-w-0 items-center gap-1 overflow-hidden rounded-lg px-1 text-left transition ${r ? 'bg-[#f6e8d0]/95' : 'border-2 border-dashed border-[#d8b78e]/70 bg-[#3c2519]/50 text-[#f0d9b8]'} ${on ? 'ring-2 ring-pink-300' : ''} ${onSlot ? 'cursor-pointer hover:brightness-105 active:scale-[0.98]' : ''}`}
            >
              {r ? (
                <>
                  <div className="flex h-full w-8 shrink-0 items-center justify-center">
                    {r.art && PAINTED_ART.includes(r.art) ? <LabImg k={`labx_art_latte_${r.art}`} className="max-h-[80%] w-full object-contain" /> : <Vessel draft={asDraft(r)} size={compact ? 30 : 38} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-display text-[10px] font-bold leading-tight text-[#5b4036] sm:text-[11px]">{r.name}</div>
                    <div className="text-[9px] leading-none text-[#c98b4c]">{stars(r.quality)}</div>
                  </div>
                  {r.id === spot && <span className="absolute right-0.5 top-0 text-sm drop-shadow" title="Spotlight drink" aria-hidden>⭐</span>}
                </>
              ) : (
                <span className="w-full text-center text-lg font-bold opacity-80" aria-hidden>+</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
