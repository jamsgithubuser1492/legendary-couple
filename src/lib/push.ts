import { getMe } from '../state/store';
import { getSupabase } from './supabase';
import { getRoom } from './sync';

/** Web push for reminders. Every function here is safe to call anywhere: none of them throw or block the game. */
export type PushStatus = 'unsupported' | 'needs-install' | 'no-key' | 'no-room' | 'blocked' | 'off' | 'on';

const VAPID = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || '';
const KEY = 'olw:push';
export interface PushPrefs { quietStart: number; quietEnd: number }
export const DEFAULT_PREFS: PushPrefs = { quietStart: 22 * 60, quietEnd: 8 * 60 };

export const pushSupported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;
export const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

export function getPrefs(): PushPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<PushPrefs>;
    return { quietStart: Number.isFinite(p.quietStart) ? (p.quietStart as number) : DEFAULT_PREFS.quietStart, quietEnd: Number.isFinite(p.quietEnd) ? (p.quietEnd as number) : DEFAULT_PREFS.quietEnd };
  } catch {
    return DEFAULT_PREFS;
  }
}
const setPrefs = (p: PushPrefs) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
};

function keyBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!pushSupported()) return null;
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    // the worker is only registered in production builds, so wait briefly for it
    return await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
  } catch {
    return null;
  }
}

export async function getPushStatus(): Promise<PushStatus> {
  try {
    if (!pushSupported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
    if (isIOS() && !isStandalone()) return 'needs-install';
    if (!VAPID) return 'no-key';
    if (Notification.permission === 'denied') return 'blocked';
    const reg = await registration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub && Notification.permission === 'granted') return 'on';
    if (!getRoom() || !getSupabase()) return 'no-room';
    return 'off';
  } catch {
    return 'unsupported';
  }
}

async function saveSubscription(sub: PushSubscription) {
  const sb = getSupabase(), room = getRoom();
  if (!sb || !room) return;
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys.auth) return;
  const prefs = getPrefs();
  try {
    await sb.from('push_subscriptions').upsert({
      endpoint: j.endpoint, room_code: room, player: getMe(), p256dh: j.keys.p256dh, auth: j.keys.auth,
      tz_offset_min: new Date().getTimezoneOffset(), quiet_start: prefs.quietStart, quiet_end: prefs.quietEnd, updated_at: new Date().toISOString(),
    });
  } catch {
    /* the next start tries again */
  }
}

/** Asks for permission (call it from a tap), subscribes this phone and saves it for the room. */
export async function subscribe(): Promise<PushStatus> {
  try {
    const before = await getPushStatus();
    if (before === 'unsupported' || before === 'needs-install' || before === 'no-key' || before === 'no-room') return before;
    if (Notification.permission !== 'granted') {
      const r = await Notification.requestPermission();
      if (r !== 'granted') return r === 'denied' ? 'blocked' : 'off';
    }
    const reg = await registration();
    if (!reg) return 'unsupported';
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) as BufferSource }));
    await saveSubscription(sub);
    return 'on';
  } catch {
    return 'off';
  }
}

export async function unsubscribe(): Promise<PushStatus> {
  try {
    const reg = await registration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      try {
        await getSupabase()?.from('push_subscriptions').delete().eq('endpoint', endpoint);
      } catch {
        /* the server also drops dead endpoints */
      }
    }
  } catch {
    /* ignore */
  }
  return getPushStatus();
}

/** Quiet hours in minutes after midnight, kept on this phone and on its subscription row. */
export async function updateQuietHours(quietStart: number, quietEnd: number) {
  setPrefs({ quietStart, quietEnd });
  try {
    const reg = await registration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) await getSupabase()?.from('push_subscriptions').update({ quiet_start: quietStart, quiet_end: quietEnd, tz_offset_min: new Date().getTimezoneOffset(), updated_at: new Date().toISOString() }).eq('endpoint', sub.endpoint);
  } catch {
    /* ignore */
  }
}

/** Keeps the saved row right when you change room, player or time zone. Safe to call at start. */
export async function refreshSubscription() {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    const reg = await registration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) await saveSubscription(sub);
  } catch {
    /* ignore */
  }
}

async function invoke(to: 'A' | 'B', kind: string, text: string) {
  const sb = getSupabase(), room = getRoom();
  if (!sb || !room) return;
  try {
    await sb.functions.invoke('notify', { body: { room, from: getMe(), to, kind, text, url: './' } });
  } catch {
    /* a missed reminder is fine */
  }
}

/** Tells the other partner something is waiting. Fire and forget. */
export function notifyPartner(kind: string, text: string) {
  void invoke(getMe() === 'A' ? 'B' : 'A', kind, text);
}

/** A reminder to this phone, so you can see it works. */
export function sendTest() {
  void invoke(getMe(), 'test', 'This is how a reminder looks. Your partner will see warm little nudges like this.');
}
