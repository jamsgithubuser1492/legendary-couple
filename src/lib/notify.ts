import type { GameState, PlayerId } from '../types';
import { getMe, getState, onStateChange } from '../state/store';
import { waitingFor, type Waiting, type WaitingKind } from '../state/waiting';
import { getRoom } from './sync';
import { notifyPartner } from './push';

export const DEBOUNCE_MS = 5000;
export const KIND_GAP_MS = 3 * 3600 * 1000; // one push per kind per partner in three hours
export const DAILY_MAX = 6;
const LOG_KEY = 'olw:notifylog';

interface Sent { ts: number; kind: WaitingKind }

export interface Deps {
  now: () => number;
  room: () => string | null;
  me: () => PlayerId;
  send: (kind: WaitingKind | 'multi', text: string) => void;
  load: () => Sent[];
  save: (log: Sent[]) => void;
}

/**
 * Decides what to tell the partner: only items I just created for them, nothing they already knew about, at most one
 * message per kind every three hours and six a day, and several new things become one gentle message.
 */
export function createNotifier(deps: Deps, initial: GameState) {
  const partner = (): PlayerId => (deps.me() === 'A' ? 'B' : 'A');
  let known = new Set(waitingFor(initial, partner()).map((w) => w.id));
  let queue = new Map<string, Waiting>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let names: GameState['names'] = initial.names;

  function flush() {
    timer = undefined;
    const items = [...queue.values()];
    queue = new Map();
    if (!items.length || !deps.room()) return;
    const now = deps.now();
    const log = deps.load().filter((e) => now - e.ts < 24 * 3600 * 1000);
    if (log.length >= DAILY_MAX) return deps.save(log);
    const fresh = items.filter((i) => !log.some((e) => e.kind === i.kind && now - e.ts < KIND_GAP_MS));
    if (!fresh.length) return deps.save(log);
    const from = names[deps.me()] || 'Your partner';
    if (fresh.length === 1) deps.send(fresh[0].kind, fresh[0].text);
    else deps.send('multi', `${from} left ${fresh.length} things for you. Take a look when you can.`);
    deps.save([...log, ...fresh.map((i) => ({ ts: now, kind: i.kind }))]);
  }

  /** Call on every state change. Only my own changes (local) can notify. */
  function onChange(s: GameState, local: boolean) {
    names = s.names;
    const items = waitingFor(s, partner());
    const added = items.filter((i) => !known.has(i.id));
    known = new Set(items.map((i) => i.id));
    if (!local || !added.length) return;
    for (const a of added) queue.set(a.id, a);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  }

  return { onChange, flush, pending: () => queue.size };
}

let started = false;

/** Call once at startup. Quiet when there is no room or no partner phone subscribed (the server drops those). */
export function startNotify() {
  if (started) return;
  started = true;
  const n = createNotifier(
    {
      now: () => Date.now(),
      room: getRoom,
      me: getMe,
      send: (kind, text) => notifyPartner(kind, text),
      load: () => {
        try {
          return JSON.parse(localStorage.getItem(LOG_KEY) || '[]') as Sent[];
        } catch {
          return [];
        }
      },
      save: (log) => {
        try {
          localStorage.setItem(LOG_KEY, JSON.stringify(log));
        } catch {
          /* ignore */
        }
      },
    },
    getState(),
  );
  onStateChange((s, local) => n.onChange(s, local));
}
