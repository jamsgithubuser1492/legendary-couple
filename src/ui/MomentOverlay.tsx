import { useEffect, useMemo, useRef, useState } from 'react';
import type { Moment } from '../types';
import { useGameState } from '../state/store';

const BITS = ['sprites/fx_star_1.png', 'sprites/fx_star_3.png', 'sprites/fx_star_5.png', '❤', '✦', '🌸', '✿', '♡'];

/**
 * Every shared celebration (weekly goal, streak rung, Grace Shield, surprise reveal, weekly recap) lands here.
 * It is written into the shared state, so it appears on both phones once, and never replays when the game opens.
 */
export default function MomentOverlay() {
  const s = useGameState();
  const seen = useRef<string | null>(s.moment?.id ?? null);
  const [m, setM] = useState<Moment | null>(null);
  const id = s.moment?.id ?? null;

  useEffect(() => {
    if (!s.moment || id === seen.current) return;
    seen.current = id;
    setM(s.moment);
    const t = setTimeout(() => setM(null), 7000);
    return () => clearTimeout(t);
  }, [id, s.moment]);

  const bits = useMemo(
    () => Array.from({ length: 34 }, (_, i) => ({ i, left: Math.random() * 100, delay: Math.random() * 1.6, dur: 3.2 + Math.random() * 2.4, size: 14 + Math.random() * 16, art: BITS[i % BITS.length] })),
    [m?.id], // a fresh shower for each moment
  );
  if (!m) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-live="polite">
      {bits.map((b) => (
        <span key={b.i} className="absolute top-0 text-pink-400" style={{ left: `${b.left}%`, animation: `confetti ${b.dur}s ${b.delay}s linear both`, fontSize: b.size }}>
          {b.art.startsWith('sprites/') ? <img src={`${import.meta.env.BASE_URL}assets/${b.art}`} alt="" style={{ width: b.size * 1.5 }} draggable={false} /> : b.art}
        </span>
      ))}
      <div className="absolute inset-x-0 top-24 flex justify-center px-4">
        <button onClick={() => setM(null)} className="animate-pop pointer-events-auto max-w-sm rounded-3xl bg-cream p-5 text-center shadow-2xl">
          {m.art ? <img src={`${import.meta.env.BASE_URL}assets/sprites/${m.art}.png`} alt="" className="mx-auto max-h-36" draggable={false} /> : <div className="text-4xl">{m.icon}</div>}
          <div className="mt-1 font-display text-xl font-bold text-cocoa">{m.title}</div>
          <p className="mt-1 text-sm text-cocoa/80">{m.text}</p>
        </button>
      </div>
    </div>
  );
}
