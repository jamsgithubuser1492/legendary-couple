/**
 * Browser integration for desktop play: window size hooks, fullscreen, and the tab itself (title count, favicon dot,
 * and a quiet notification when something new waits for you and the tab is hidden).
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { getMe, getState, onStateChange } from '../state/store';
import { waitingFor } from '../state/waiting';
import { getPushStatus } from './push';

// ---- window size and pointer ----
function useMedia(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [on, setOn] = useState(get);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const f = () => setOn(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [query]);
  return on;
}
/** A real desktop browser window: a mouse and at least 1024 px across. Phones and small tablets keep the touch layout. */
export const useDesktop = () => useMedia('(min-width: 1024px) and (pointer: fine)');
/** Room for labels in the dock. */
export const useWide = () => useMedia('(min-width: 1280px)');
/** Room for the Today panel beside the map. */
export const useXWide = () => useMedia('(min-width: 1440px)');

// ---- fullscreen ----
export const canFullscreen = () => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
export function toggleFullscreen() {
  try {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  } catch {
    /* a sandboxed page may refuse */
  }
}
export const useFullscreen = () =>
  useSyncExternalStore(
    (l) => {
      document.addEventListener('fullscreenchange', l);
      return () => document.removeEventListener('fullscreenchange', l);
    },
    () => !!document.fullscreenElement,
  );

// ---- the tab: title count, favicon dot, quiet notification ----
const BASE_TITLE = 'Our Little World';

function faviconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]');
}

/** The island emoji with a pink dot in the corner, drawn once and kept as a data URL. */
function badgedIcon(): string | null {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (!g) return null;
    g.font = '52px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.fillText('🏝️', 30, 36);
    g.fillStyle = '#f472b6';
    g.beginPath();
    g.arc(48, 16, 13, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#ffffff';
    g.stroke();
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** How many things wait for me right now (what the title shows). */
export const waitingCount = () => waitingFor(getState(), getMe()).length;

/** Keeps the tab title and favicon in step with what is waiting for you. Returns a cleanup function. */
export function startBrowserIntegration(): () => void {
  const link = faviconLink();
  const plain = link?.href ?? '';
  let badged: string | null | undefined;
  let shown = -1;
  const ids = () => new Set(waitingFor(getState(), getMe()).map((w) => w.id));
  let prev = ids();

  const apply = () => {
    const n = waitingCount();
    if (n === shown) return;
    shown = n;
    document.title = n > 0 ? `(${n}) ${BASE_TITLE}` : BASE_TITLE;
    if (!link) return;
    if (n > 0) {
      if (badged === undefined) badged = badgedIcon();
      if (badged) link.href = badged;
    } else if (plain) link.href = plain;
  };

  const off = onStateChange((_s, local) => {
    apply();
    const now = ids();
    const fresh = waitingFor(getState(), getMe()).filter((w) => !prev.has(w.id));
    prev = now;
    // something new from my partner while this tab is hidden: one quiet note, unless push already covers it
    if (local || !fresh.length || !document.hidden || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    void getPushStatus().then((st) => {
      if (st === 'on') return;
      try {
        new Notification(BASE_TITLE, { body: fresh.length > 1 ? `${fresh.length} things are waiting for you.` : fresh[0].text, tag: 'olw-waiting', silent: true, icon: 'icon-192.png' });
      } catch {
        /* some browsers only allow notifications from a service worker */
      }
    });
  });
  const onVisible = () => {
    shown = -1;
    prev = ids();
    apply();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  apply();
  return () => {
    off();
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    document.title = BASE_TITLE;
    if (link && plain) link.href = plain;
  };
}
