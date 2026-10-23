import type { ReactNode } from 'react';
import type { View } from '../game/events';
import { dateKey } from '../state/questions';
import { arrivalWaiting, promotionReady } from '../state/crew';
import { otherPlayer, useGameState, useMe } from '../state/store';
import { hasActivity, lastWeekKey, mondayOf, recapOf, streakNow } from '../state/weekly';
import { CurrencyIcon } from './Currency';

export type PhoneAction = 'cafe' | 'cafePanel' | 'checkin' | 'week' | 'streak' | 'surprise' | 'together' | 'vault' | 'arcade' | 'boxes' | 'wardrobe' | 'journal' | 'decorate' | 'rituals' | 'townPanel' | 'dream' | 'crew' | 'roster';

/** Everything the HUD used to show as a stack of round buttons, tucked into one calm drawer. */
export function usePhoneBadges() {
  const s = useGameState();
  const me = useMe();
  const wg = s.weekly[mondayOf()];
  const weekDot = !wg || (!wg.paid && wg.ticks.some((t) => !t.ok && t.by !== me)) || (!s.recapClaimed.includes(lastWeekKey()) && hasActivity(recapOf(s, lastWeekKey())));
  const surprises = s.surprises.filter((x) => x.to === me && !x.doneAt).length;
  const boxWaiting = !!s.pendingBox && s.pendingBox.by === otherPlayer(me);
  const bottles = s.bottles.filter((b) => !b.opened && b.from !== me).length;
  return {
    checkin: !s.checkins[dateKey()]?.[me] ? 1 : 0,
    week: weekDot ? 1 : 0,
    surprise: surprises,
    boxes: boxWaiting ? 1 : 0,
    rituals: s.bottleCredits[me] + bottles,
    crew: arrivalWaiting(s).length + Object.values(s.cafe.crew ?? {}).filter(promotionReady).length,
  };
}

function Tile({ icon, label, badge, onClick }: { icon: ReactNode; label: string; badge?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center gap-1 rounded-2xl bg-white p-2 text-cocoa shadow active:scale-95">
      <span className="flex h-10 items-center justify-center text-3xl">{icon}</span>
      <span className="text-center font-display text-xs font-bold leading-tight">{label}</span>
      {!!badge && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{badge}</span>}
    </button>
  );
}

export default function PocketPhone({ view, onClose, onAct }: { view: View; onClose: () => void; onAct: (a: PhoneAction) => void }) {
  const s = useGameState();
  const b = usePhoneBadges();
  const streak = streakNow(s);
  const wg = s.weekly[mondayOf()];
  const go = (a: PhoneAction) => () => { onClose(); onAct(a); };
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-end bg-cocoa/20 p-3 sm:items-center sm:justify-center" onClick={onClose}>
      <div className="animate-drawer w-full max-w-sm rounded-[2rem] bg-cream p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-cocoa">📱 Our World</h2>
          <button onClick={onClose} className="rounded-full bg-blush px-3 py-1 font-bold text-cocoa" aria-label="Close">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={go('week')} className="relative rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3 text-left text-cocoa shadow active:scale-95">
            <div className="font-display text-xs font-bold uppercase opacity-60">🗓️ Sunday goal</div>
            <div className="text-sm font-bold">{wg ? `${wg.ticks.filter((t) => t.ok).length}/${wg.target} ${wg.title}` : 'Not set yet'}</div>
            {!!b.week && <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-red-500" />}
          </button>
          <button onClick={go('streak')} className="rounded-2xl bg-gradient-to-r from-amber-100 to-pink-100 p-3 text-left text-cocoa shadow active:scale-95">
            <div className="font-display text-xs font-bold uppercase opacity-60">🏮 Synergy Lantern</div>
            <div className="text-sm font-bold">{streak} {streak === 1 ? 'day' : 'days'}</div>
          </button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <Tile icon="💬" label="Daily question" badge={b.checkin} onClick={go('checkin')} />
          <Tile icon="💞" label="Together" onClick={go('together')} />
          <Tile icon="💌" label="Postbox" badge={b.surprise} onClick={go('surprise')} />
          <Tile icon="🗝️" label="Memory Vault" onClick={go('vault')} />
          {view === 'cafe' ? <Tile icon="⭐" label="Café rating" onClick={go('cafePanel')} /> : <Tile icon="☕" label="Our café" onClick={go('cafe')} />}
          {view === 'cafe' && <Tile icon="👥" label="Café crew" badge={b.crew} onClick={go('crew')} />}
          <Tile icon="🎮" label="Arcade" onClick={go('arcade')} />
          <Tile icon="🌟" label="Rituals" badge={b.rituals} onClick={go('rituals')} />
          {view !== 'town' ? (
            <>
              <Tile icon={<CurrencyIcon kind="box" size={36} />} label="Blind boxes" badge={b.boxes || s.blindBoxes} onClick={go('boxes')} />
              <Tile icon="👗" label="Wardrobe" onClick={go('wardrobe')} />
              <Tile icon="📔" label="Journal" onClick={go('journal')} />
              <Tile icon="🎨" label="Decorate" onClick={go('decorate')} />
            </>
          ) : (
            <>
              <Tile icon="🌱" label="Town growth" onClick={go('townPanel')} />
              <Tile icon="🖼️" label="Dream map" onClick={go('dream')} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
