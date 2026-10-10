import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabase';
import type { PlayerId } from '../../types';

export interface NetMsg {
  t: string; // 'snap' | 'in' | 'hello' | 'end' | 'bye' | 'invite' | ...
  p?: unknown;
  from: PlayerId;
}

/**
 * A small broadcast channel for a minigame.
 * Online it uses Supabase Realtime broadcast (no database writes, so it is fast). With ?localnet in the address it uses
 * the browser's BroadcastChannel instead, which lets two tabs on one computer act as two players for testing.
 */
export class MinigameNet {
  private ch: RealtimeChannel | null = null;
  private bc: BroadcastChannel | null = null;
  private handlers = new Set<(m: NetMsg) => void>();
  private joined = false;

  constructor(readonly name: string, readonly me: PlayerId) {}

  static localOnly(): boolean {
    try {
      return new URLSearchParams(location.search).has('localnet');
    } catch {
      return false;
    }
  }

  async join(): Promise<void> {
    if (this.joined) return;
    this.joined = true;
    const sb = getSupabase();
    if (sb && !MinigameNet.localOnly()) {
      const ch = sb.channel(this.name, { config: { broadcast: { self: false, ack: false } } });
      ch.on('broadcast', { event: 'm' }, ({ payload }) => this.handlers.forEach((h) => h(payload as NetMsg)));
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 4000);
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timer);
            resolve();
          }
        });
      });
      this.ch = ch;
    } else {
      this.bc = new BroadcastChannel(this.name);
      this.bc.onmessage = (e) => this.handlers.forEach((h) => h(e.data as NetMsg));
    }
  }

  on(h: (m: NetMsg) => void): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  send(t: string, p?: unknown) {
    const m: NetMsg = { t, p, from: this.me };
    if (this.ch) void this.ch.send({ type: 'broadcast', event: 'm', payload: m });
    else this.bc?.postMessage(m);
  }

  async leave() {
    this.handlers.clear();
    this.bc?.close();
    this.bc = null;
    if (this.ch) await getSupabase()?.removeChannel(this.ch);
    this.ch = null;
    this.joined = false;
  }
}
