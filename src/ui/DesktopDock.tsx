import type { ReactNode } from 'react';
import type { View } from '../game/events';
import { pendingFor, useGameState, useMe } from '../state/store';
import { waitingFor } from '../state/waiting';
import { canFullscreen, toggleFullscreen, useFullscreen } from '../lib/browser';
import { SHORTCUTS, keyFor, type ShortcutId } from '../lib/shortcuts';
import { CurrencyIcon } from './Currency';
import { usePhoneBadges, type PhoneAction } from './PocketPhone';

interface Item { id: string; icon: ReactNode; label: string; hint?: string; badge?: number; dot?: boolean; on?: boolean; run: () => void }

/** Space the dock takes from the left of the window (the map is centered in what is left). */
export const DOCK_ICON_W = 68;
export const DOCK_WIDE_W = 196;

/** The left rail for desktop browsers: everything the Pocket Phone holds, one click away, with the shortcut keys shown. */
export default function DesktopDock({ view, wide, todayOpen, onToday, onAct, onQuests, onView, onUs, onHelp }: {
  view: View;
  wide: boolean;
  todayOpen: boolean;
  onToday: () => void;
  onAct: (a: PhoneAction) => void;
  onQuests: () => void;
  onView: (v: View) => void;
  onUs: () => void;
  onHelp: () => void;
}) {
  const s = useGameState();
  const me = useMe();
  const b = usePhoneBadges();
  const pending = pendingFor(s, me).length;
  const waiting = waitingFor(s, me).length;
  const full = useFullscreen();
  const inTown = view === 'town', inCafe = view === 'cafe';
  const act = (a: PhoneAction) => () => onAct(a);
  const hintOf = (id?: ShortcutId) => (id ? keyFor(id) : undefined);

  const groups: Item[][] = [
    [
      { id: 'today', icon: '☀️', label: 'Today', badge: waiting, on: todayOpen, run: onToday },
      { id: 'quests', icon: '📋', label: 'Quests', hint: hintOf('quests'), badge: pending, run: onQuests },
      { id: 'daily', icon: '💬', label: 'Daily question', badge: b.checkin, run: act('checkin') },
      { id: 'week', icon: '🗓️', label: 'Weekly goal', dot: !!b.week, run: act('week') },
    ],
    [
      { id: 'together', icon: '💞', label: 'Together', run: act('together') },
      { id: 'postbox', icon: '💌', label: 'Postbox', badge: b.surprise, run: act('surprise') },
      { id: 'vault', icon: '🗝️', label: 'Memory Vault', run: act('vault') },
      { id: 'rituals', icon: '🌟', label: 'Rituals', badge: b.rituals, run: act('rituals') },
    ],
    [
      inCafe ? { id: 'cafe', icon: '⭐', label: 'Café rating', hint: hintOf('cafe'), run: act('cafePanel') } : { id: 'cafe', icon: '☕', label: 'Our café', hint: hintOf('cafe'), run: act('cafe') },
      { id: 'crew', icon: '👥', label: 'Café crew', hint: hintOf('crew'), badge: b.crew, run: act('crew') },
      { id: 'arcade', icon: '🎮', label: 'Arcade', hint: hintOf('arcade'), run: act('arcade') },
      { id: 'view', icon: inTown ? '🏝️' : inCafe ? '🚪' : '🌍', label: inTown ? 'Home island' : inCafe ? 'Back outside' : 'Town map', hint: hintOf('town'), run: () => onView(inTown || inCafe ? 'island' : 'town') },
    ],
    inTown
      ? [
          { id: 'growth', icon: '🌱', label: 'Town growth', run: act('townPanel') },
          { id: 'dream', icon: '🖼️', label: 'Dream map', run: act('dream') },
        ]
      : [
          { id: 'boxes', icon: <CurrencyIcon kind="box" size={22} />, label: 'Blind boxes', badge: b.boxes || s.blindBoxes, run: act('boxes') },
          { id: 'wardrobe', icon: '👗', label: 'Wardrobe', run: act('wardrobe') },
          { id: 'journal', icon: '📔', label: 'Journal', hint: hintOf('journal'), run: act('journal') },
          { id: 'decorate', icon: '🎨', label: 'Decorate', hint: hintOf('decorate'), run: act('decorate') },
        ],
  ];
  const tail: Item[] = [
    ...(canFullscreen() ? [{ id: 'full', icon: full ? '🗗' : '⛶', label: full ? 'Leave full screen' : 'Full screen', on: full, run: toggleFullscreen }] : []),
    { id: 'help', icon: '⌨️', label: 'Shortcuts', hint: '?', run: onHelp },
    { id: 'us', icon: '💕', label: 'Us and settings', run: onUs },
  ];

  const entry = (it: Item) => (
    <button
      key={it.id}
      onClick={it.run}
      title={it.hint ? `${it.label} (${it.hint})` : it.label}
      aria-label={it.label}
      className={`relative flex h-10 shrink-0 cursor-pointer [@media(max-height:820px)]:h-8 items-center gap-2 rounded-2xl px-1.5 text-cocoa transition hover:bg-white active:scale-95 ${it.on ? 'bg-white shadow-sm' : ''} ${wide ? 'w-full' : 'w-10 justify-center [@media(max-height:820px)]:w-9'}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-xl">{it.icon}</span>
      {wide && <span className="min-w-0 flex-1 truncate text-left font-display text-sm font-bold">{it.label}</span>}
      {wide && it.hint && <kbd className="rounded-md bg-blush/70 px-1.5 text-[11px] font-bold text-cocoa/70">{it.hint}</kbd>}
      {!!it.badge && <span className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-400 px-1 text-[10px] font-bold text-white ${wide ? 'right-1.5 top-1' : '-right-0.5 -top-0.5'}`}>{it.badge}</span>}
      {!it.badge && it.dot && <span className={`absolute h-2.5 w-2.5 rounded-full bg-pink-400 ${wide ? 'right-2 top-2' : 'right-0.5 top-0.5'}`} />}
    </button>
  );

  return (
    <nav aria-label="Our world" className="pointer-events-auto absolute bottom-3 left-3 top-[68px] z-10 flex flex-col gap-1 overflow-hidden rounded-3xl bg-cream/90 p-1.5 shadow-lg" style={{ width: (wide ? DOCK_WIDE_W : DOCK_ICON_W) - 12 }}>
      <div className="olw-body flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {groups.map((g, i) => (
          <div key={i} className="flex flex-col gap-0.5 border-b border-blush/60 pb-1">{g.map(entry)}</div>
        ))}
      </div>
      <div className="flex shrink-0 flex-col gap-0.5 border-t border-blush/60 pt-1">{tail.map(entry)}</div>
    </nav>
  );
}

/** The keyboard cheat sheet. */
export function ShortcutsCard({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-cocoa/20 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="animate-drawer w-full max-w-sm rounded-3xl bg-cream p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-cocoa">⌨️ Shortcuts</h2>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer rounded-full bg-blush px-3 py-1 font-bold text-cocoa transition hover:brightness-95 active:scale-95">✕</button>
        </div>
        <ul className="grid gap-1.5">
          {SHORTCUTS.map((k) => (
            <li key={k.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-1.5 text-cocoa">
              <span className="text-sm font-bold">{k.label}</span>
              <kbd className="rounded-md bg-blush px-2 py-0.5 text-xs font-bold">{k.key}</kbd>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-cocoa/70">Walk with W, A, S, D or the arrow keys. Scroll to zoom and drag to look around. Shortcuts pause while you type or play a game.</p>
      </div>
    </div>
  );
}
