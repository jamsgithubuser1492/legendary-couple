import type { HoverPayload } from '../game/events';
import type { StartingPath } from '../types';
import { levelOf, otherPlayer, pendingFor, useGameState, useMe } from '../state/store';
import { dateKey } from '../state/questions';
import { useSyncStatus } from '../lib/sync';
import { CurrencyIcon } from './Currency';

const LABEL: Record<StartingPath, string> = {
  rv: '🚐 The RV Life',
  shop: '☕ The Shop & Café',
  home: '🏡 The Home Foundation',
};

const DOT: Record<string, string> = {
  local: 'bg-gray-400',
  connecting: 'bg-yellow-400',
  synced: 'bg-green-400',
  pending: 'bg-yellow-400',
  error: 'bg-red-400',
};

interface Props {
  hover: HoverPayload;
  editing: boolean;
  view: 'island' | 'town';
  growth: number;
  onView: (v: 'island' | 'town') => void;
  onTownPanel: () => void;
  onDream: () => void;
  onCenter: () => void;
  onZoom: (d: number) => void;
  onChangePath: () => void;
  onQuests: () => void;
  onUs: () => void;
  onDecorate: () => void;
  onJournal: () => void;
  onCheckin: () => void;
  onBoxes: () => void;
  onWardrobe: () => void;
  onTogether: () => void;
}

const btn =
  'pointer-events-auto relative rounded-full bg-cream/90 px-4 py-2 font-display text-base font-bold text-cocoa shadow active:scale-95';
const side =
  'pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-full bg-cream/90 text-xl shadow active:scale-95';
const badge = 'absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white';

export default function Hud(p: Props) {
  const s = useGameState();
  const me = useMe();
  const sync = useSyncStatus();
  const pending = pendingFor(s, me).length;
  const level = levelOf(s.xp);
  const unanswered = !s.checkins[dateKey()]?.[me];
  const boxWaiting = s.pendingBox && s.pendingBox.by === otherPlayer(me);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3">
      <div className="flex items-start justify-between gap-2">
        <button onClick={p.onUs} className="pointer-events-auto flex items-center gap-2 rounded-full bg-cream/90 px-3 py-1.5 shadow">
          <span className="text-xl">{me === 'A' ? '🧑' : '👩'}</span>
          <span className="text-left">
            <span className="block font-display text-sm font-bold leading-none text-cocoa">{s.names[me]} · Lv. {level}</span>
            <span className="mt-1 block h-1.5 w-20 rounded-full bg-blush"><span className="block h-full rounded-full bg-pink-400" style={{ width: `${s.xp % 100}%` }} /></span>
          </span>
          <span className="font-display text-sm text-cocoa"><CurrencyIcon kind="coin" size={18} /> {s.coins.toLocaleString()}</span>
          <span className="font-display text-sm text-cocoa"><CurrencyIcon kind="gem" size={18} /> {s.gems}</span>
          <span className="font-display text-sm text-cocoa">🐚 {s.shells}</span>
          <span className={`h-2.5 w-2.5 rounded-full ${DOT[sync]}`} title={`Sync: ${sync}`} />
        </button>
        <div className="rounded-2xl bg-cream/90 px-3 py-1.5 text-right shadow">
          <div className="font-display text-sm font-bold text-cocoa">Our Little World ♡</div>
          <div className="text-xs text-cocoa/70">{s.startingPath ? LABEL[s.startingPath] : 'Pick a path'}</div>
        </div>
      </div>

      {!p.editing && p.view === 'town' && (
        <div className="absolute right-3 top-20 flex flex-col gap-2">
          <button className={side} onClick={() => p.onView('island')} aria-label="Home island">🏝️</button>
          <button className={side} onClick={p.onTownPanel} aria-label="Town growth">🌱</button>
          <button className={side} onClick={p.onDream} aria-label="Dream map">🖼️</button>
          <button className={side} onClick={p.onTogether} aria-label="Together">💞</button>
          <button className={side} onClick={p.onCheckin} aria-label="Daily question">💬{unanswered && <span className={`${badge} !h-3 !min-w-3`} />}</button>
        </div>
      )}
      {!p.editing && p.view === 'island' && (
        <div className="absolute right-3 top-20 flex flex-col gap-2">
          <button className={side} onClick={() => p.onView('town')} aria-label="Town map">🌍</button>
          <button className={side} onClick={p.onTogether} aria-label="Together">💞</button>
          <button className={side} onClick={p.onCheckin} aria-label="Daily question">💬{unanswered && <span className={`${badge} !h-3 !min-w-3`} />}</button>
          <button className={side} onClick={p.onBoxes} aria-label="Blind boxes"><CurrencyIcon kind="box" size={28} />{(s.blindBoxes > 0 || boxWaiting) && <span className={badge}>{boxWaiting ? '!' : s.blindBoxes}</span>}</button>
          <button className={side} onClick={p.onWardrobe} aria-label="Wardrobe">👗</button>
          <button className={side} onClick={p.onJournal} aria-label="Memory Journal">📔</button>
          <button className={side} onClick={p.onDecorate} aria-label="Decorate">🎨</button>
        </div>
      )}

      <div className={`flex items-end justify-between gap-2 ${p.editing ? 'invisible' : ''}`}>
        {p.view === 'town' ? (
          <button onClick={p.onTownPanel} className="pointer-events-auto rounded-full bg-cream/90 px-3 py-1.5 text-xs font-bold text-cocoa shadow">🌱 Town growth {p.growth}</button>
        ) : (
          <div className="rounded-full bg-cream/90 px-3 py-1.5 text-xs text-cocoa shadow">
            {p.hover ? `Tile (${p.hover.x}, ${p.hover.y})` : 'Tap a tile to walk'}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button className={btn} onClick={() => p.onZoom(-0.2)} aria-label="Zoom out">−</button>
          <button className={btn} onClick={() => p.onZoom(0.2)} aria-label="Zoom in">+</button>
          <button className={btn} onClick={p.onCenter} aria-label="Center">🎯</button>
          <button className={`${btn} bg-pink-400 text-white`} onClick={p.onQuests}>
            📋 Quests
            {pending > 0 && <span className={badge}>{pending}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
