import { useState } from 'react';
import { starterStage } from '../state/town';
import { useGameState } from '../state/store';
import Sheet, { primaryBtn } from './Sheet';

type Path = 'rv' | 'shop' | 'home';
const TITLE: Record<Path, string> = { rv: 'The RV Life', shop: 'The Shop & Café', home: 'The Home Foundation' };
const STAGES: Record<Path, [string, string, string]> = {
  rv: ['Day one: your RV', 'Settling in: campfire and gear', 'Finished: a real campsite'],
  shop: ['Day one: your little shop', 'Settling in: seats and a patio', 'Finished: a full café'],
  home: ['Day one: the foundation', 'Settling in: lumber and frames', 'Finished: ready to decorate'],
};
const base = import.meta.env.BASE_URL;
/** The See on Island view. */
export default function SeeOnIsland({ onClose, onShowIsland }: { onClose: () => void; onShowIsland: () => void }) {
  const s = useGameState();
  const path = s.startingPath;
  const current = starterStage(s);
  const [view, setView] = useState<1 | 2 | 3>(current);
  if (!path) return null;
  return (
    <Sheet title="Your place on the island" onClose={onClose} wide>
      <div className="overflow-hidden rounded-2xl shadow-lg">
        <img src={`${base}assets/see_island_${path}.webp`} alt={TITLE[path]} className="animate-pop block w-full" draggable={false} />
      </div>
      <div className="mt-3 font-display text-lg font-bold text-cocoa">{TITLE[path]}</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {([1, 2, 3] as const).map((n) => (
          <button key={n} onClick={() => setView(n)} className={`rounded-xl p-2 text-center text-xs font-bold text-cocoa ${view === n ? 'bg-pink-100 ring-2 ring-pink-400' : 'bg-white shadow'} ${n > current ? 'opacity-70' : ''}`}>
            {STAGES[path][n - 1]}
            <div className="mt-0.5 text-[10px] font-bold text-pink-500">{n === current ? 'You are here' : n > current ? 'Coming up' : 'Done'}</div>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-cocoa/70">Your starter grows as your partner approves your goals: a new stage at 2 and at 6 approved goals. You have {s.approvedCount}.</p>
      <button className={`${primaryBtn} mt-3 w-full`} onClick={() => { onClose(); onShowIsland(); }}>Zoom to my build 🔍</button>
    </Sheet>
  );
}
