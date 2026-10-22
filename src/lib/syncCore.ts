import { merge3 } from '../state/merge';
import type { GameState } from '../types';

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'pending' | 'error';
export interface Row { state: GameState; stamp: string }

/** What the engine needs from the server. The real one is Supabase, the tests use a small in memory server. */
export interface Adapter {
  select(room: string): Promise<Row | null>;
  /** Writes only if the row still has baseStamp. Returns the new stamp, or null when somebody else wrote first. */
  conditionalUpdate(room: string, state: GameState, baseStamp: string): Promise<string | null>;
  /** First write for a room. Returns the stamp, or null when the row already exists (we lost the race). */
  insert(room: string, state: GameState): Promise<string | null>;
  /** onRow gets every change; state may be missing when the server left a big row out. */
  subscribe(room: string, onRow: (row: { stamp?: string; state?: GameState }) => void, onReady: () => void): () => void;
}

export interface Env {
  adapter: Adapter;
  getState(): GameState;
  /** Shows a merged or remote state without sending it back (the store's applyRemote). */
  applyRemote(state: GameState): void;
  storage: { get(k: string): string | null; set(k: string, v: string): void };
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(t: unknown): void;
  random(): number;
  online(): boolean;
  onStatus(s: SyncStatus, error: string): void;
}

const BASE_KEY = 'olw:sync:base';
const STAMP_KEY = 'olw:sync:stamp';
const TRIES = 5;
const json = (v: unknown) => JSON.stringify(v);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const sameTime = (a?: string, b?: string | null) => !!a && !!b && (a === b || Date.parse(a) === Date.parse(b));

/**
 * Keeps one phone's game state in step with the shared row without losing either phone's changes.
 * It remembers the last state the server confirmed (base). A save only succeeds if nobody wrote since then; if
 * somebody did, it fetches their version, merges the three states and tries again. Incoming changes are merged the
 * same way, so work done offline or at the same moment is combined, not overwritten.
 */
export class SyncEngine {
  private room: string | null = null;
  private base: GameState | null = null;
  private baseStamp: string | null = null;
  private dirty = false;
  private pushing = false;
  private again = false;
  private timer: unknown;
  private retry: unknown;
  private fails = 0;
  private gen = 0;
  private unsub: (() => void) | null = null;
  status: SyncStatus = 'local';
  error = '';

  constructor(private env: Env) {}

  private set(s: SyncStatus, err = '') {
    this.status = s;
    this.error = err;
    this.env.onStatus(s, err);
  }

  stop() {
    this.gen++;
    this.unsub?.();
    this.unsub = null;
    this.env.clearTimeout(this.timer);
    this.env.clearTimeout(this.retry);
    this.room = null;
    this.base = null;
    this.baseStamp = null;
    this.dirty = false;
    this.pushing = false;
    this.again = false;
    this.fails = 0;
  }

  async start(room: string) {
    this.stop();
    this.room = room;
    const gen = this.gen;
    this.set('connecting');
    try {
      const row = await this.env.adapter.select(room);
      if (gen !== this.gen) return;
      if (!row) {
        this.dirty = true; // a new room: our state becomes the first row
      } else {
        this.loadPersisted(room);
        const remote = row.state;
        const hasRemote = remote && Object.keys(remote).length > 0;
        if (!hasRemote) this.dirty = true; // the row exists but is empty
        else if (this.base) this.adopt(row, merge3(this.base, this.env.getState(), remote)); // offline edits survive a restart
        else this.adopt(row, remote); // first time on this phone: the shared game wins
        this.baseStamp = row.stamp;
        if (!hasRemote) this.base = null;
        this.save();
      }
    } catch (e) {
      this.fail(e);
      return;
    }
    if (gen !== this.gen) return;
    this.unsub = this.env.adapter.subscribe(room, (r) => void this.receive(r), () => void this.resync());
    this.set(this.dirty ? 'pending' : 'synced');
    if (this.dirty) void this.push();
  }

  /** Call when the local game state changed because of something the player did. */
  changed() {
    if (!this.room) return;
    this.dirty = true;
    this.set('pending');
    this.env.clearTimeout(this.timer);
    this.timer = this.env.setTimeout(() => void this.push(), 400);
  }

  /** The tab came back or the network returned: send what is waiting, and catch up on what we missed. */
  async resync() {
    if (!this.room) return;
    if (this.dirty) return this.push();
    try {
      const row = await this.env.adapter.select(this.room);
      if (row && !sameTime(row.stamp, this.baseStamp)) await this.receive({ stamp: row.stamp, state: row.state });
    } catch (e) {
      this.fail(e);
    }
  }

  // ---- incoming
  private async receive(r: { stamp?: string; state?: GameState }) {
    const room = this.room, gen = this.gen;
    if (!room) return;
    if (sameTime(r.stamp, this.baseStamp)) return; // our own write coming back
    let row: Row | null = r.stamp && r.state ? { stamp: r.stamp, state: r.state } : null;
    if (!row) {
      try {
        row = await this.env.adapter.select(room); // a big row can arrive without its state
      } catch (e) {
        return this.fail(e);
      }
    }
    if (gen !== this.gen || !row || sameTime(row.stamp, this.baseStamp)) return;
    this.adopt(row, this.base ? merge3(this.base, this.env.getState(), row.state) : row.state);
    this.baseStamp = row.stamp;
    this.save();
    if (this.dirty) {
      this.set('pending');
      void this.push();
    } else this.set('synced');
  }

  /** Shows the merged state and remembers the server's version as the new base. */
  private adopt(row: Row, merged: GameState) {
    if (json(merged) !== json(this.env.getState())) this.env.applyRemote(merged);
    this.base = clone(row.state);
    this.dirty = json(merged) !== json(row.state); // anything the server does not have yet still has to be sent
  }

  // ---- outgoing
  async push() {
    const room = this.room;
    if (!room) return;
    if (this.pushing) {
      this.again = true;
      return;
    }
    this.pushing = true;
    const gen = this.gen;
    this.env.clearTimeout(this.timer);
    this.env.clearTimeout(this.retry);
    try {
      for (let i = 0; i < TRIES; i++) {
        if (!this.env.online()) {
          this.set('pending');
          return;
        }
        const mine = this.env.getState();
        const copy = clone(mine);
        const stamp = this.baseStamp === null ? await this.env.adapter.insert(room, copy) : await this.env.adapter.conditionalUpdate(room, copy, this.baseStamp);
        if (gen !== this.gen) return;
        if (stamp) {
          this.base = copy;
          this.baseStamp = stamp;
          this.fails = 0;
          this.save();
          this.dirty = this.env.getState() !== mine && json(this.env.getState()) !== json(copy);
          this.set(this.dirty ? 'pending' : 'synced');
          if (this.dirty) this.again = true;
          return;
        }
        // somebody else wrote first: merge their version with ours, then try again
        const row = await this.env.adapter.select(room);
        if (gen !== this.gen) return;
        if (!row) {
          this.baseStamp = null;
          continue;
        }
        this.adopt(row, this.base ? merge3(this.base, this.env.getState(), row.state) : row.state);
        this.baseStamp = row.stamp;
        this.dirty = true;
        await new Promise((res) => this.env.setTimeout(() => res(null), 30 + this.env.random() * 90 * (i + 1)));
      }
      this.fail(new Error('Could not save after several tries'));
    } catch (e) {
      if (gen === this.gen) this.fail(e);
    } finally {
      if (gen === this.gen) {
        this.pushing = false;
        if (this.again && this.status !== 'error') {
          this.again = false;
          void this.push();
        }
      }
    }
  }

  private fail(e: unknown) {
    this.fails++;
    this.set('error', e instanceof Error ? e.message : String(e));
    this.env.clearTimeout(this.retry);
    const wait = Math.min(30000, 2000 * 2 ** Math.min(this.fails, 4));
    this.retry = this.env.setTimeout(() => void (this.base || this.dirty ? this.push() : this.start(this.room!)), wait);
    this.pushing = false;
  }

  // ---- what the server confirmed, kept so offline edits survive closing the app
  private save() {
    try {
      if (this.base) this.env.storage.set(BASE_KEY, json(this.base));
      this.env.storage.set(STAMP_KEY, json({ room: this.room, stamp: this.baseStamp }));
    } catch {
      /* storage full: the next start lets the shared game win, as it always did */
    }
  }

  private loadPersisted(room: string) {
    try {
      const s = JSON.parse(this.env.storage.get(STAMP_KEY) ?? 'null') as { room: string } | null;
      const b = this.env.storage.get(BASE_KEY);
      if (s && s.room === room && b) this.base = JSON.parse(b) as GameState;
    } catch {
      this.base = null;
    }
  }
}
