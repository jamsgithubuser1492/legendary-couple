/** Keyboard shortcuts for desktop play. W, A, S, D and the arrows stay with walking. */
import { useEffect, useRef } from 'react';

export type ShortcutId = 'quests' | 'decorate' | 'town' | 'cafe' | 'arcade' | 'journal' | 'help' | 'escape';

export const SHORTCUTS: { id: ShortcutId; key: string; label: string }[] = [
  { id: 'quests', key: 'Q', label: 'Quests' },
  { id: 'decorate', key: 'D', label: 'Decorate' },
  { id: 'town', key: 'T', label: 'Town and island' },
  { id: 'cafe', key: 'C', label: 'Café, in and out' },
  { id: 'arcade', key: 'G', label: 'Arcade' },
  { id: 'journal', key: 'J', label: 'Journal' },
  { id: 'help', key: '?', label: 'This list (also H)' },
  { id: 'escape', key: 'Esc', label: 'Close, or step back' },
];
/** The key to show beside a dock entry. */
export const keyFor = (id: ShortcutId) => SHORTCUTS.find((s) => s.id === id)?.key;

const BY_KEY: Record<string, ShortcutId> = { q: 'quests', d: 'decorate', t: 'town', c: 'cafe', g: 'arcade', j: 'journal', h: 'help', '?': 'help', Escape: 'escape' };

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
};

/**
 * Calls onKey for a shortcut. It listens in the capture phase on the window so it sees Escape before any dialog does,
 * which lets the app decide whether a dialog is about to take it. Ignored while typing and while a game is running
 * (the games use the keyboard themselves), except Escape, which the caller filters.
 */
export function useShortcuts(onKey: (id: ShortcutId, e: KeyboardEvent) => void, enabled: boolean) {
  const cb = useRef(onKey);
  cb.current = onKey;
  useEffect(() => {
    if (!enabled) return;
    const f = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const id = BY_KEY[e.key] ?? BY_KEY[e.key.toLowerCase()];
      if (!id) return;
      if (id !== 'escape' && typing(e.target)) return;
      cb.current(id, e);
    };
    window.addEventListener('keydown', f, true);
    return () => window.removeEventListener('keydown', f, true);
  }, [enabled]);
}
