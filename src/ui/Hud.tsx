import { usePhoneBadges } from './PocketPhone';
import type { HoverPayload, View } from '../game/events';
import type { StartingPath } from '../types';
import { levelOf, pendingFor, useGameState, useMe } from '../state/store';
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
  view: View;
  growth: number;
  onView: (v: View) => void;
  onTownPanel: () => void;
  onCenter: () => void;
  onZoom: (d: number) => void;
  onChangePath: () => void;
  onQuests: () => void;
  onUs: () => void;
  onPhone: () => void;
  onSeeIsland: () => void;
  desktop?: boolean; // a desktop browser: the dock holds the phone drawer and the view switch
  dockOffset?: number; // pixels the dock takes from the left
}

const btn =
  'pointer-events-auto relative cursor-pointer rounded-full bg-cream/90 px-4 py-2 font-display text-base font-bold text-cocoa shadow transition hover:bg-cream active:scale-95';
const side =
  'pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-full bg-cream/90 text-xl shadow active:scale-95';
const badge = 'absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white';

export default function Hud(p: Props) {
  const s = useGameState();
  const me = useMe();
  const sync = useSyncStatus();
  const pending = pendingFor(s, me).length;
  const level = levelOf(s.xp);
  const b = usePhoneBadges();
  const badgeCount = b.checkin + b.week + b.surprise + b.boxes + b.rituals;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3">
      <div className="flex items-start justify-between gap-2">
        <button onClick={p.onUs} title="Us: names, room and settings" aria-label="Us and settings" className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full bg-cream/90 px-3 py-1.5 shadow transition hover:bg-cream">
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
        <button onClick={p.onSeeIsland} disabled={!s.startingPath} title="See your starting path on the island" className="pointer-events-auto cursor-pointer rounded-2xl bg-cream/90 px-3 py-1.5 text-right shadow transition hover:bg-cream active:scale-95 disabled:cursor-default" aria-label="See on island">
          <div className="font-display text-sm font-bold text-cocoa">Our Little World ♡</div>
          <div className="text-xs text-cocoa/70">{s.startingPath ? `${LABEL[s.startingPath]} · See on island` : 'Pick a path'}</div>
        </button>
      </div>

      {!p.editing && !p.desktop && (
        <div className="absolute right-3 top-20 flex flex-col gap-2">
          <button className={side} onClick={() => p.onView(p.view === 'island' ? 'town' : 'island')} aria-label={p.view === 'island' ? 'Town map' : p.view === 'cafe' ? 'Back outside' : 'Home island'}>{p.view === 'island' ? '🌍' : p.view === 'cafe' ? '🚪' : '🏝️'}</button>
          <button className={side} onClick={p.onPhone} aria-label="Pocket phone">📱{badgeCount > 0 && <span className={`${badge} !h-3 !min-w-3`} />}</button>
        </div>
      )}

      <div className={`flex items-end justify-between gap-2 ${p.editing ? 'invisible' : ''}`}>
        {p.view === 'town' ? (
          <button onClick={p.onTownPanel} style={{ marginLeft: p.dockOffset }} title="Town growth" className="pointer-events-auto cursor-pointer rounded-full bg-cream/90 px-3 py-1.5 text-xs font-bold text-cocoa shadow transition hover:bg-cream">🌱 Town growth {p.growth}</button>
        ) : (
          <div style={{ marginLeft: p.dockOffset }} className="rounded-full bg-cream/90 px-3 py-1.5 text-xs text-cocoa shadow">
            {p.hover ? `Tile (${p.hover.x}, ${p.hover.y})` : p.desktop ? 'Click a tile to walk, drag to look around, scroll to zoom' : 'Tap a tile to walk'}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button className={btn} onClick={() => p.onZoom(-0.2)} aria-label="Zoom out" title="Zoom out (scroll down)">−</button>
          <button className={btn} onClick={() => p.onZoom(0.2)} aria-label="Zoom in" title="Zoom in (scroll up)">+</button>
          <button className={btn} onClick={p.onCenter} aria-label="Center" title="Center the view">🎯</button>
          <button className={`${btn} bg-pink-400 text-white`} onClick={p.onQuests} aria-label="Quests" title={p.desktop ? 'Quests (Q)' : 'Quests'}>
            📋 Quests
            {pending > 0 && <span className={badge}>{pending}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
