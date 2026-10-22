import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { SyncEngine, type Adapter, type Row } from './syncCore';

type S = { coins: number; quests: { id: string; status: string }[]; placed: { id: string }[] };
const start = (): S => ({ coins: 1000, quests: [{ id: 'q1', status: 'NEW' }, { id: 'q2', status: 'NEW' }], placed: [] });
const asGame = (s: S) => s as unknown as GameState;

/** A tiny in memory stand in for the shared row, with switches for the awkward cases. */
class FakeServer {
  row: Row | null = null;
  n = 0;
  subs = new Map<number, (r: { stamp?: string; state?: GameState }) => void>();
  dropEvents = new Set<number>();
  omitState = false;
  alwaysConflict = false;
  private stamp = () => `2026-10-22T10:00:${String(++this.n).padStart(2, '0')}.000+00:00`;
  adapter(id: number): Adapter {
    return {
      select: async () => (this.row ? { state: structuredClone(this.row.state), stamp: this.row.stamp } : null),
      conditionalUpdate: async (_room, state, baseStamp) => {
        if (this.alwaysConflict) {
          this.row = { state: this.row!.state, stamp: this.stamp() }; // somebody keeps writing
          return null;
        }
        if (!this.row || this.row.stamp !== baseStamp) return null;
        this.row = { state: structuredClone(state), stamp: this.stamp() };
        this.emit(id);
        return this.row.stamp;
      },
      insert: async (_room, state) => {
        if (this.row) return null;
        this.row = { state: structuredClone(state), stamp: this.stamp() };
        return this.row.stamp;
      },
      subscribe: (_room, onRow, onReady) => {
        this.subs.set(id, onRow);
        onReady();
        return () => void this.subs.delete(id);
      },
    };
  }
  private emit(from: number) {
    for (const [id, cb] of this.subs) if (id !== from || true) if (!this.dropEvents.has(id)) cb(this.omitState ? { stamp: this.row!.stamp } : { stamp: this.row!.stamp, state: structuredClone(this.row!.state) });
  }
}

class Phone {
  state: S = start();
  online = true;
  store = new Map<string, string>();
  engine: SyncEngine;
  constructor(public server: FakeServer, public id: number, state?: S) {
    if (state) this.state = state;
    this.engine = this.make();
  }
  make() {
    return new SyncEngine({
      adapter: this.server.adapter(this.id),
      getState: () => asGame(this.state),
      applyRemote: (s) => { this.state = s as unknown as S; },
      storage: { get: (k) => this.store.get(k) ?? null, set: (k, v) => void this.store.set(k, v) },
      setTimeout: (fn) => setTimeout(fn, 0),
      clearTimeout: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
      random: () => 0,
      online: () => this.online,
      onStatus: () => undefined,
    });
  }
  edit(fn: (s: S) => void) {
    const next = structuredClone(this.state);
    fn(next);
    this.state = next; // a new object, like the store does
    this.engine.changed();
  }
}

const settle = async (...ps: Phone[]) => {
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 5));
    if (ps.every((p) => p.engine.status === 'synced')) {
      await new Promise((r) => setTimeout(r, 15));
      if (ps.every((p) => p.engine.status === 'synced')) return;
    }
  }
};

async function pair() {
  const server = new FakeServer();
  const a = new Phone(server, 1), b = new Phone(server, 2);
  await a.engine.start('ROOM');
  await b.engine.start('ROOM');
  await settle(a, b);
  return { server, a, b };
}

describe('sync engine', () => {
  it('shares the first state and then both phones converge', async () => {
    const { a, b } = await pair();
    expect(b.state).toEqual(a.state);
  });

  it('keeps both phones spending coins at the same moment', async () => {
    const { a, b } = await pair();
    a.edit((s) => { s.coins -= 100; });
    b.edit((s) => { s.coins -= 250; });
    await settle(a, b);
    expect(a.state.coins).toBe(650);
    expect(b.state).toEqual(a.state);
  });

  it('keeps both approvals and both placements', async () => {
    const { a, b } = await pair();
    a.edit((s) => { s.quests[0].status = 'APPROVED'; s.placed.push({ id: 'p1' }); });
    b.edit((s) => { s.quests[1].status = 'APPROVED'; s.placed.push({ id: 'p2' }); });
    await settle(a, b);
    expect(a.state.quests.map((q) => q.status)).toEqual(['APPROVED', 'APPROVED']);
    expect(a.state.placed.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    expect(b.state).toEqual(a.state);
  });

  it('combines offline edits with what happened meanwhile', async () => {
    const { a, b } = await pair();
    b.online = false;
    b.edit((s) => { s.coins -= 40; s.placed.push({ id: 'b1' }); });
    a.edit((s) => { s.coins += 70; });
    await settle(a);
    expect(b.engine.status).toBe('pending');
    b.online = true;
    await b.engine.resync();
    await settle(a, b);
    expect(a.state.coins).toBe(1030);
    expect(b.state).toEqual(a.state);
    expect(a.state.placed).toEqual([{ id: 'b1' }]);
  });

  it('catches up after a lost realtime event', async () => {
    const { server, a, b } = await pair();
    server.dropEvents.add(2);
    a.edit((s) => { s.coins += 5; });
    await settle(a);
    expect(b.state.coins).toBe(1000);
    await b.engine.resync();
    await settle(a, b);
    expect(b.state.coins).toBe(1005);
  });

  it('refetches when the event arrives without its state', async () => {
    const { server, a, b } = await pair();
    server.omitState = true;
    a.edit((s) => { s.coins += 9; });
    await settle(a, b);
    expect(b.state.coins).toBe(1009);
  });

  it('gives up with an error after repeated conflicts, then recovers', async () => {
    const { server, a } = await pair();
    server.alwaysConflict = true;
    a.edit((s) => { s.coins += 1; });
    await new Promise((r) => setTimeout(r, 200));
    expect(a.engine.status).toBe('error');
    expect(a.engine.error).toMatch(/several tries/);
    server.alwaysConflict = false;
    await a.engine.push();
    await settle(a);
    expect(a.engine.status).toBe('synced');
  });

  it('keeps offline edits across a restart (persisted base)', async () => {
    const { server, a, b } = await pair();
    b.online = false;
    b.edit((s) => { s.coins += 11; });
    // the persisted base is only written after a server confirmation, so it still holds the shared state
    a.edit((s) => { s.coins -= 3; });
    await settle(a);
    const restarted = new Phone(server, 3, structuredClone(b.state));
    restarted.store = b.store;
    await restarted.engine.start('ROOM');
    await settle(restarted, a);
    expect(restarted.state.coins).toBe(1008);
    expect(a.state.coins).toBe(1008);
  });

  it('never loses a coin across many concurrent changes', async () => {
    const { a, b } = await pair();
    let total = 1000;
    for (let round = 0; round < 12; round++) {
      const da = (round % 5) * 7 - 10, db = 13 - (round % 4) * 9;
      a.edit((s) => { s.coins += da; });
      b.edit((s) => { s.coins += db; });
      total += da + db;
      if (round % 3 === 0) await settle(a, b);
    }
    await settle(a, b);
    expect(a.state.coins).toBe(total);
    expect(b.state.coins).toBe(total);
  });
});
