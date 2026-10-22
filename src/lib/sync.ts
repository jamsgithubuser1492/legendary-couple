import { useSyncExternalStore } from 'react';
import { getSupabase } from './supabase';
import { SyncEngine, type Adapter, type SyncStatus } from './syncCore';
import { applyRemote, getState, onStateChange, setMe } from '../state/store';
import type { GameState, PlayerId } from '../types';

export type { SyncStatus };

const ROOM_KEY = 'olw:room';
let status: SyncStatus = 'local';
let room: string | null = (() => {
  try {
    return localStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
})();
const listeners = new Set<() => void>();
let started = false;

let lastError = '';
export const getSyncError = () => lastError;

const setStatus = (s: SyncStatus) => {
  status = s;
  listeners.forEach((l) => l());
};

export const useSyncStatus = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => status,
  );

export const getRoom = () => room;
export const syncAvailable = () => getSupabase() !== null;

/** A link that opens the game already connected to your room and signed in as the chosen partner. */
export function inviteLink(forPlayer: PlayerId): string | null {
  if (!room) return null;
  return `${location.origin}${location.pathname}?room=${room}&as=${forPlayer}`;
}

/** Reads ?room=CODE&as=A|B from the address, joins that room as that partner, then tidies the address. */
function applyInvite() {
  try {
    const q = new URLSearchParams(location.search);
    const code = q.get('room')?.trim().toUpperCase();
    const as = q.get('as');
    if (!code) return;
    room = code;
    localStorage.setItem(ROOM_KEY, code);
    if (as === 'A' || as === 'B') setMe(as);
    q.delete('room');
    q.delete('as');
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
  } catch {
    /* ignore */
  }
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function joinRoom(code: string) {
  room = code.trim().toUpperCase() || null;
  try {
    if (room) localStorage.setItem(ROOM_KEY, room);
    else localStorage.removeItem(ROOM_KEY);
  } catch {
    /* ignore */
  }
  startEngine();
}

const reason = (e: { message: string; code?: string } | null) => (e ? `${e.message}${e.code ? ` (${e.code})` : ''}` : '');

/** The Supabase side of the engine: one row per room, written only if nobody wrote since we last looked. */
function supabaseAdapter(): Adapter | null {
  const sb = getSupabase();
  if (!sb) return null;
  return {
    async select(room) {
      const { data, error } = await sb.from('game_state').select('state, updated_at').eq('room_code', room).maybeSingle();
      if (error) throw new Error(reason(error));
      return data ? { state: data.state as GameState, stamp: data.updated_at as string } : null;
    },
    async conditionalUpdate(room, state, baseStamp) {
      const { data, error } = await sb
        .from('game_state')
        .update({ state, updated_at: new Date().toISOString() })
        .eq('room_code', room)
        .eq('updated_at', baseStamp)
        .select('updated_at');
      if (error) throw new Error(reason(error));
      return data && data.length ? (data[0].updated_at as string) : null;
    },
    async insert(room, state) {
      const { data, error } = await sb.from('game_state').insert({ room_code: room, state, updated_at: new Date().toISOString() }).select('updated_at');
      if (error) {
        if (error.code === '23505') return null; // the other phone created the room first
        throw new Error(reason(error));
      }
      return data && data.length ? (data[0].updated_at as string) : null;
    },
    subscribe(room, onRow, onReady) {
      const ch = sb
        .channel(`room:${room}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `room_code=eq.${room}` }, (payload) => {
          const n = payload.new as { state?: GameState; updated_at?: string } | undefined;
          if (n) onRow({ stamp: n.updated_at, state: n.state && Object.keys(n.state).length ? n.state : undefined });
        })
        .subscribe((st) => st === 'SUBSCRIBED' && onReady());
      return () => void sb.removeChannel(ch);
    },
  };
}

let engine: SyncEngine | null = null;

function makeEngine(): SyncEngine | null {
  const adapter = supabaseAdapter();
  if (!adapter) return null;
  return new SyncEngine({
    adapter,
    getState,
    applyRemote,
    storage: { get: (k) => localStorage.getItem(k), set: (k, v) => localStorage.setItem(k, v) },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
    random: Math.random,
    online: () => navigator.onLine,
    onStatus: (s, err) => {
      lastError = err;
      setStatus(s);
    },
  });
}

function startEngine() {
  engine?.stop();
  if (!room) {
    setStatus('local');
    return;
  }
  engine ??= makeEngine();
  if (!engine) {
    setStatus('local');
    return;
  }
  void engine.start(room);
}

/** Call once at startup. Safe to call with no Supabase config (stays in local mode). */
export function startSync() {
  if (started) return;
  started = true;
  applyInvite();
  onStateChange((_s, local) => {
    if (local && room) engine?.changed();
  });
  window.addEventListener('online', () => void engine?.resync()); // offline queue: flush on reconnect
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void engine?.resync(); // catch up on what a sleeping tab missed
  });
  startEngine();
}
