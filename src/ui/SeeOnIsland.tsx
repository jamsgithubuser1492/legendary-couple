import { useState } from 'react';
import { SPRITES } from '../game/spriteList';
import { starterStage, STARTER_PROPS } from '../state/town';
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
const dwOf = (k: string) => SPRITES.find((s) => s.key === k)?.dw ?? 40;
const K = 1.55; // screen pixels per game pixel

/** Your place on the island, drawn from your own starter art and growing with your stage. Same layout the island uses. */
function Scene({ path, stage }: { path: Path; stage: 1 | 2 | 3 }) {
  const W = 560, H = 300, ox = W / 2, oy = 150;
  const items = [
    { key: `start_${path}`, x: ox, y: oy - 4 * K, d: 2.1 },
    ...STARTER_PROPS[path].filter((p) => p.stage <= stage).map((p) => ({ key: p.key, x: ox + (p.dx - p.dy) * 32 * K, y: oy + ((p.dx + p.dy - 2) * 16 + 22) * K, d: p.dx + p.dy + 2.4 })),
  ].sort((a, b) => a.d - b.d);
  const R = 5.2; // half the plot patch in tiles
  const pt = (x: number, y: number) => `${ox + (x - y) * 32 * K},${oy + (x + y - 2) * 16 * K - 16 * K}`;
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg" style={{ height: H, background: 'linear-gradient(#bfe6f2 0%, #d9eef0 55%, #a8d8e6 100%)' }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <polygon points={`${pt(-R + 1, -R + 1)} ${pt(R + 1, -R + 1)} ${pt(R + 1, R + 1)} ${pt(-R + 1, R + 1)}`} fill="#e9d8ae" transform="translate(0,16)" />
        <polygon points={`${pt(-R + 1.4, -R + 1.4)} ${pt(R + 0.6, -R + 1.4)} ${pt(R + 0.6, R + 0.6)} ${pt(-R + 1.4, R + 0.6)}`} fill="#dfe3a0" transform="translate(0,12)" />
        <polygon points={`${pt(0.2, 0.2)} ${pt(1.8, 0.2)} ${pt(1.8, 1.8)} ${pt(0.2, 1.8)}`} fill="#b98f62" opacity="0.45" transform="translate(0,12)" />
      </svg>
      {items.map((it) => {
        const w = dwOf(it.key) * K;
        return <img key={it.key} src={`${base}assets/sprites/${it.key}.png`} alt="" draggable={false} className="absolute" style={{ width: w, left: `calc(50% + ${it.x - ox}px)`, top: it.y, transform: 'translate(-50%,-100%)' }} />;
      })}
    </div>
  );
}

/** The See on Island view. */
export default function SeeOnIsland({ onClose, onShowIsland }: { onClose: () => void; onShowIsland: () => void }) {
  const s = useGameState();
  const path = s.startingPath;
  const current = starterStage(s);
  const [view, setView] = useState<1 | 2 | 3>(current);
  if (!path) return null;
  return (
    <Sheet title="Your place on the island" onClose={onClose} wide>
      <Scene path={path} stage={view} />
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
