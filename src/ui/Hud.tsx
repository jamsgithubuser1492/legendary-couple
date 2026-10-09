import type { HoverPayload } from '../game/events';
import type { StartingPath } from '../types';
import { levelOf, pendingFor, useGameState, useMe } from '../state/store';
import { useSyncStatus } from '../lib/sync';

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
  onCenter: () => void;
  onZoom: (d: number) => void;
  onChangePath: () => void;
  onQuests: () => void;
  onUs: () => void;
}

const btn =
  'pointer-events-auto relative rounded-full bg-cream/90 px-4 py-2 font-display text-base font-bold text-cocoa shadow active:scale-95';

export default function Hud({ hover, onCenter, onZoom, onChangePath, onQuests, onUs }: Props) {
  const s = useGameState();
  const me = useMe();
  const sync = useSyncStatus();
  const pending = pendingFor(s, me).length;
  const level = levelOf(s.xp);
  const into = s.xp % 100;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onUs} className="pointer-events-auto flex items-center gap-2 rounded-full bg-cream/90 px-3 py-1.5 shadow">
          <span className="text-xl">{me === 'A' ? '🧑' : '👩'}</span>
          <span className="text-left">
            <span className="block font-display text-sm font-bold leading-none text-cocoa">{s.names[me]} · Lv. {level}</span>
            <span className="mt-1 block h-1.5 w-20 rounded-full bg-blush"><span className="block h-full rounded-full bg-pink-400" style={{ width: `${into}%` }} /></span>
          </span>
          <span className="font-display text-sm text-cocoa">🪙 {s.coins.toLocaleString()}</span>
          <span className="font-display text-sm text-cocoa">💎 {s.gems}</span>
          <span className={`h-2.5 w-2.5 rounded-full ${DOT[sync]}`} title={`Sync: ${sync}`} />
        </button>
        <div className="rounded-2xl bg-cream/90 px-3 py-1.5 text-right shadow">
          <div className="font-display text-sm font-bold text-cocoa">Our Little World ♡</div>
          <div className="text-xs text-cocoa/70">{s.startingPath ? LABEL[s.startingPath] : 'Pick a path'}</div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="rounded-full bg-cream/90 px-3 py-1.5 text-xs text-cocoa shadow">
          {hover ? `Tile (${hover.x}, ${hover.y})` : 'Tap a tile to walk'}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button className={btn} onClick={() => onZoom(-0.2)} aria-label="Zoom out">−</button>
          <button className={btn} onClick={() => onZoom(0.2)} aria-label="Zoom in">+</button>
          <button className={btn} onClick={onCenter}>🎯</button>
          <button className={btn} onClick={onChangePath}>🗺️</button>
          <button className={`${btn} bg-pink-400 text-white`} onClick={onQuests}>
            📋 Quests
            {pending > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{pending}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
