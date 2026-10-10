import { useEffect, useState } from 'react';
import { BUS, gameBus } from '../game/events';
import { brewDrink, createQuest, levelOf, tossWell, useGameState, useMe } from '../state/store';
import { activityOf, arcadeOpen } from '../state/town';
import { itemOf } from '../state/catalog';
import { dateKey } from '../state/questions';
import ItemIcon from './ItemIcon';
import { REGIONS, LOTS, actualGrowth, growthOf, nextMilestone, setGrowthPreview, useGrowthPreview } from '../state/town';
import Sheet, { primaryBtn, softBtn } from './Sheet';

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
  const built = LOTS.filter((l) => growth >= l.at && (l.minLevel === undefined || levelOf(s.xp) >= l.minLevel) && growth >= REGIONS.find((r) => r.id === l.region)!.unlockAt && l.kind !== 'tree' && l.kind !== 'pine').length;
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

const RECIPES: { itemId: string; cost: number; blurb: string }[] = [
  { itemId: 'food_matcha', cost: 1, blurb: 'Whisked matcha with silky milk.' },
  { itemId: 'latte_gold', cost: 1, blurb: 'A golden latte with a little heart.' },
  { itemId: 'food_tray', cost: 1, blurb: 'A pot of tea for two.' },
  { itemId: 'food_croissant', cost: 1, blurb: 'Warm, flaky and buttery.' },
  { itemId: 'food_macarons', cost: 2, blurb: 'A box of pastel macarons.' },
  { itemId: 'food_cake_a', cost: 2, blurb: 'A berry cake to share.' },
];

const pick = <T,>(arr: T[], seed: string): T => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
};

/** What you can do at a place in town: brew drinks, browse a shop, or pick up a date idea. */
export function TownInteract({ lotId, onClose, onShop, onTogether, onOpen }: { lotId: string; onClose: () => void; onShop: (cat: string) => void; onTogether: (tab: string) => void; onOpen: (what: string) => void }) {
  const s = useGameState();
  const me = useMe();
  const lot = LOTS.find((l) => l.id === lotId);
  const act = lot ? activityOf(lot.name) : undefined;
  if (!lot || !act) return null;

  if (act.kind === 'open' && act.what === 'well') return <WishingWell title={act.title} line={act.line} onClose={onClose} />;
  if (act.kind === 'open') {
    const locked = act.what === 'arcade' && !arcadeOpen(s);
    return (
      <Sheet title={act.title} onClose={onClose}>
        <p className="text-cocoa">{act.line}</p>
        {locked && <p className="mt-2 rounded-xl bg-white p-3 text-sm font-bold text-cocoa">🔒 The Arcade opens at town growth 150 and player level 4.</p>}
        <button className={`${primaryBtn} mt-4 w-full`} disabled={locked} onClick={() => { onClose(); onOpen(act.what); }}>Open</button>
        <button className={`${softBtn} mt-2 w-full`} onClick={onClose}>Not now</button>
      </Sheet>
    );
  }

  if (act.kind === 'brew') {
    return (
      <Sheet title={`${lot.name} ☕`} onClose={onClose}>
        <p className="text-sm text-cocoa/80">Behind the counter, you can brew treats together. Every drink you make goes into your bag as decor for your home.</p>
        <div className="mt-2 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3 text-center font-display font-bold text-cocoa">
          🫘 Ingredients: {s.ingredients}
          <div className="text-xs font-normal text-cocoa/70">Earn more by completing Body and Mind quests (+2 each).</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {RECIPES.map((r) => {
            const it = itemOf(r.itemId)!;
            return (
              <div key={r.itemId} className="flex flex-col rounded-2xl bg-white p-2 text-center shadow">
                <div className="flex h-12 items-center justify-center"><ItemIcon id={r.itemId} size={44} /></div>
                <div className="font-display text-sm font-bold text-cocoa">{it.name}</div>
                <div className="text-[11px] text-cocoa/60">{r.blurb}</div>
                <button
                  disabled={s.ingredients < r.cost}
                  onClick={() => brewDrink(r.itemId, r.cost)}
                  className="mt-1 rounded-full bg-pink-400 px-3 py-1 font-display text-sm font-bold text-white shadow active:scale-95 disabled:opacity-40"
                >
                  Brew · 🫘 {r.cost}
                </button>
              </div>
            );
          })}
        </div>
        <button className={`${softBtn} mt-3 w-full`} onClick={onClose}>Done</button>
      </Sheet>
    );
  }

  if (act.kind === 'shop') {
    return (
      <Sheet title={lot.name} onClose={onClose}>
        <p className="text-cocoa">{act.line}</p>
        <button className={`${primaryBtn} mt-4 w-full`} onClick={() => { onClose(); onShop(act.cat); }}>Browse the shop 🛍</button>
        <button className={`${softBtn} mt-2 w-full`} onClick={onClose}>Not now</button>
      </Sheet>
    );
  }

  if (act.kind === 'together') {
    return (
      <Sheet title={act.title} onClose={onClose}>
        <p className="text-cocoa">{act.line}</p>
        <button className={`${primaryBtn} mt-4 w-full`} onClick={() => { onClose(); onTogether(act.tab); }}>Sit by the fire 🔥</button>
        <button className={`${softBtn} mt-2 w-full`} onClick={onClose}>Not now</button>
      </Sheet>
    );
  }

  const idea = pick(act.ideas, `${dateKey()}${lot.name}`);
  return (
    <Sheet title={act.title} onClose={onClose}>
      <p className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-4 font-display text-lg font-bold text-cocoa">{idea}</p>
      <p className="mt-2 text-xs text-cocoa/60">This one is for real life. Do it together, then log it as a quest.</p>
      <button
        className={`${primaryBtn} mt-4 w-full`}
        onClick={() => {
          createQuest({ title: act.title.replace(/ [^\w\s]+$/u, ''), area: 'romance', description: idea, assignedTo: me, reward: { coins: 15, gems: 0 } });
          onClose();
          gameBus.emit(BUS.townToast, { text: '📋 Added to your Quest Board' });
        }}
      >
        Add as a quest
      </button>
      <button className={`${softBtn} mt-2 w-full`} onClick={onClose}>Close</button>
    </Sheet>
  );
}

function WishingWell({ title, line, onClose }: { title: string; line: string; onClose: () => void }) {
  const s = useGameState();
  const [result, setResult] = useState<string | null>(null);
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="text-cocoa">{line}</p>
      <p className="mt-2 text-sm text-cocoa/70">Each toss costs 10 coins. Most wishes bring a Heart Shell, and some bring a lot more.</p>
      {result && <p className="animate-pop mt-3 rounded-2xl bg-gradient-to-r from-amber-100 to-pink-100 p-3 text-center font-display font-bold text-cocoa">{result}</p>}
      <button className={`${primaryBtn} mt-4 w-full`} disabled={s.coins < 10} onClick={() => setResult(tossWell())}>Toss a coin (10 coins)</button>
      <button className={`${softBtn} mt-2 w-full`} onClick={onClose}>Done</button>
    </Sheet>
  );
}
