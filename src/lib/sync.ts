import { useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { applyRemote, getState, onStateChange, setMe } from '../state/store';
import type { PlayerId } from '../types';

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'pending' | 'error';

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
let channel: RealtimeChannel | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let dirty = false;
let started = false;

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
  void connect();
}

async function push() {
  const sb = getSupabase();
  if (!sb || !room) return;
  if (!navigator.onLine) {
    dirty = true;
    setStatus('pending');
    return;
  }
  const { error } = await sb
    .from('game_state')
    .upsert({ room_code: room, state: getState(), updated_at: new Date().toISOString() });
  if (error) {
    dirty = true;
    setStatus('error');
  } else {
    dirty = false;
    setStatus('synced');
  }
}

async function connect() {
  const sb = getSupabase();
  if (channel) {
    await sb?.removeChannel(channel);
    channel = null;
  }
  if (!sb || !room) {
    setStatus('local');
    return;
  }
  setStatus('connecting');
  const code = room;
  const { data, error } = await sb.from('game_state').select('state').eq('room_code', code).maybeSingle();
  if (error) {
    setStatus('error');
    return;
  }
  if (data?.state && Object.keys(data.state).length) applyRemote(data.state);
  else await push();

  channel = sb
    .channel(`room:${code}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `room_code=eq.${code}` }, (payload) => {
      const next = (payload.new as { state?: unknown })?.state;
      if (next && JSON.stringify(next) !== JSON.stringify(getState())) applyRemote(next as never);
    })
    .subscribe((s) => {
      if (s === 'SUBSCRIBED') setStatus(dirty ? 'pending' : 'synced');
    });
}

/** Call once at startup. Safe to call with no Supabase config (stays in local mode). */
export function startSync() {
  if (started) return;
  started = true;
  applyInvite();
  onStateChange((_s, local) => {
    if (!local || !room || !getSupabase()) return;
    dirty = true;
    setStatus('pending');
    clearTimeout(timer);
    timer = setTimeout(push, 400);
  });
  window.addEventListener('online', () => dirty && void push()); // offline queue: flush on reconnect
  void connect();
}
