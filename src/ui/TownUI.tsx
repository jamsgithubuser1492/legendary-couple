import { useEffect, useState } from 'react';
import { BUS, gameBus } from '../game/events';
import { useGameState } from '../state/store';
import { REGIONS, LOTS, actualGrowth, growthOf, nextMilestone, setGrowthPreview, useGrowthPreview } from '../state/town';
import Sheet, { softBtn } from './Sheet';

/** Small message card for things happening in the town: new buildings, regions opening, tapped places. */
export function TownToast() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (m: { text: string }) => {
      setText(m.text);
      clearTimeout(timer);
      timer = setTimeout(() => setText(null), 4200);
    };
    gameBus.on(BUS.townToast, on);
    return () => {
      clearTimeout(timer);
      gameBus.off(BUS.townToast, on);
    };
  }, []);
  if (!text) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center px-4">
      <div className="animate-pop max-w-sm rounded-2xl bg-cream/95 px-4 py-3 text-center font-display text-sm font-bold text-cocoa shadow-xl">{text}</div>
    </div>
  );
}

export function TownPanel({ onClose, onDream }: { onClose: () => void; onDream: () => void }) {
  const s = useGameState();
  const preview = useGrowthPreview();
  const growth = growthOf(s);
  const next = nextMilestone(growth);
  const built = LOTS.filter((l) => growth >= l.at && growth >= REGIONS.find((r) => r.id === l.region)!.unlockAt && l.kind !== 'tree' && l.kind !== 'pine').length;
  const total = LOTS.filter((l) => l.kind !== 'tree' && l.kind !== 'pine').length;

  return (
    <Sheet title="Our Town 🌱" onClose={onClose}>
      <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-4 text-center">
        <div className="font-display text-4xl font-bold text-cocoa">{growth}</div>
        <div className="text-sm text-cocoa/70">growth {preview !== null && '(preview)'}</div>
        <div className="mt-1 text-xs text-cocoa/70">{built} of {total} buildings built</div>
        {next && <div className="mt-2 text-sm font-bold text-cocoa">Next: {next.label} at {next.at}</div>}
      </div>
      <p className="mt-3 text-sm text-cocoa/80">
        Your town grows when you grow together: approved quests (3 each), memories (5), daily questions (2) and anything you decorate. Real life is what builds it.
      </p>
      <div className="mt-3 space-y-2">
        {REGIONS.map((r) => {
          const open = growth >= r.unlockAt;
          return (
            <div key={r.id} className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow ${open ? '' : 'opacity-60'}`}>
              <span className="text-2xl">{open ? r.icon : '🔒'}</span>
              <div className="flex-1">
                <div className="font-display font-bold text-cocoa">{r.name}</div>
                <div className="text-xs text-cocoa/60">{open ? r.blurb : `Opens at ${r.unlockAt} growth`}</div>
              </div>
            </div>
          );
        })}
      </div>
      <button className={`${softBtn} mt-3 w-full`} onClick={onDream}>🖼️ See the dream map</button>
      <details className="mt-3 text-sm text-cocoa">
        <summary className="cursor-pointer font-display font-bold">Preview a grown town (this device only)</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {[null, 40, 80, 130, 200, 260].map((v) => (
            <button key={String(v)} onClick={() => setGrowthPreview(v)} className={`rounded-full px-3 py-1 text-sm font-bold ${preview === v ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>
              {v === null ? `Real (${actualGrowth(s)})` : v}
            </button>
          ))}
        </div>
      </details>
    </Sheet>
  );
}

/** The full dream map. Parts of it you have not opened yet stay hidden behind mist. */
export function DreamMap({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const growth = growthOf(s);
  const zones: { id: string; label: string; need: number; box: string }[] = [
    { id: 'country', label: 'Countryside & Farms', need: 30, box: 'left-[48%] top-[20%] h-[28%] w-[34%]' },
    { id: 'mountain', label: 'Mountain Trail', need: 70, box: 'left-[72%] top-[8%] h-[30%] w-[28%]' },
    { id: 'campus', label: 'Future Campus', need: 180, box: 'left-[76%] top-[48%] h-[22%] w-[24%]' },
    { id: 'downtown', label: 'Downtown Extension', need: 120, box: 'left-[72%] top-[68%] h-[32%] w-[28%]' },
  ];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-cocoa/50 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-full w-full max-w-3xl overflow-auto rounded-3xl bg-cream p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-display text-xl font-bold text-cocoa">Our Little World, the dream 🌅</h2>
          <button onClick={onClose} className="rounded-full bg-blush px-3 py-1 font-bold text-cocoa" aria-label="Close">✕</button>
        </div>
        <div className="relative overflow-hidden rounded-2xl">
          <img src={`${import.meta.env.BASE_URL}assets/world_map.jpg`} alt="The whole world map" className="block w-full" draggable={false} />
          {zones.filter((z) => growth < z.need).map((z) => (
            <div key={z.id} className={`absolute ${z.box} flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-md`}>
              <span className="rounded-full bg-cream/90 px-3 py-1 text-center font-display text-xs font-bold text-cocoa shadow sm:text-sm">🔒 {z.label}<br />at {z.need}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 px-1 text-xs text-cocoa/60">Everything here is what you are building toward. Grow together and the mist lifts.</p>
      </div>
    </div>
  );
}
