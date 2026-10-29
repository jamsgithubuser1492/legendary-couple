import { DOOR_X } from '../state/cafe';

/** What the café shows on a live event day. Pure, so it can be tested without a scene. */
export type EventId = 'adopt' | 'study' | 'jazz' | 'latte';
export interface Tile { x: number; y: number }
export interface TableAt extends Tile { h: number }

export interface DecorPlan {
  lights: 'sk_lights_globe' | 'sk_lights_star' | 'ev_lights_warm';
  bunting: 'ev_bunting_pink' | 'ev_bunting_sky' | 'ev_bunting_sage' | null;
  /** A wooden or chalk sign two tiles wide on a back wall: `at` is the first tile along it (x on the right wall, the lower y on the left wall). */
  sign: { key: string; wall: 'left' | 'right'; at: number } | null;
  props: { key: string; tile: Tile; blocks: boolean; role: 'pen' | 'pets' | 'basket' | 'power' | 'owl' | 'record' | 'barrel' | 'board' }[];
  /** Laptop clutter stands on up to three tables. */
  laptops: TableAt[];
  /** Tiles the props occupy, so guests and crew walk around them. */
  blocked: string[];
}

const key = (t: Tile) => `${t.x},${t.y}`;
/** The door sits in the back right wall at DOOR_X: keep the way in clear. */
export const inEntryZone = (t: Tile) => t.x >= DOOR_X - 1 && t.x <= DOOR_X + 1 && t.y <= 2;

/** Every floor tile that is free: inside the walls, not in the entry zone, not blocked, not occupied right now. */
export function freeTiles(size: number, blocked: Set<string>, occupied: Set<string> = new Set()): Tile[] {
  const out: Tile[] = [];
  for (let x = 1; x < size; x++) for (let y = 1; y < size; y++) {
    const t = { x, y };
    if (!inEntryZone(t) && !blocked.has(key(t)) && !occupied.has(key(t))) out.push(t);
  }
  return out;
}

/** The first free n by n patch, against the left wall and as far from the door as the room allows. */
export function patchOf(n: number, size: number, blocked: Set<string>, occupied: Set<string>): Tile | null {
  const free = new Set(freeTiles(size, blocked, occupied).map(key));
  const found: Tile[] = [];
  for (let x = 1; x + n <= size; x++) for (let y = 1; y + n <= size; y++) {
    let ok = true;
    for (let i = 0; i < n && ok; i++) for (let j = 0; j < n; j++) if (!free.has(`${x + i},${y + j}`)) { ok = false; break; }
    if (ok) found.push({ x, y });
  }
  found.sort((a, b) => a.x - b.x || a.y - b.y);
  return found[0] ?? null;
}

/** A free tile close to the back walls, nearest to where it wants to be, never one that is already used. */
function spotNear(free: Tile[], used: Set<string>, want?: Tile): Tile | null {
  const score = (t: Tile) => (want ? Math.abs(t.x - want.x) + Math.abs(t.y - want.y) : Math.min(t.x, t.y) * 2 + (t.x + t.y) * 0.01);
  const ok = free.filter((t) => !used.has(key(t)));
  ok.sort((a, b) => score(a) - score(b) || a.x - b.x || a.y - b.y);
  return ok[0] ?? null;
}

export interface PlanInput {
  event: EventId;
  size: number;
  blocked: Set<string>;
  occupied?: Set<string>;
  tables?: TableAt[];
  routers?: Tile[];
  counters?: Tile[]; // espresso, pastry case or register
}

export function planEventDecor(inp: PlanInput): DecorPlan {
  const { event, size } = inp;
  const occupied = inp.occupied ?? new Set<string>();
  const used = new Set<string>();
  const props: DecorPlan['props'] = [];
  const blockedOut: string[] = [];
  const free = freeTiles(size, inp.blocked, occupied);
  const claim = (role: DecorPlan['props'][number]['role'], k: string, t: Tile | null, blocks: boolean) => {
    if (!t) return null;
    props.push({ key: k, tile: t, blocks, role });
    used.add(key(t));
    if (blocks) blockedOut.push(key(t));
    return t;
  };
  const plan: DecorPlan = {
    lights: event === 'study' ? 'sk_lights_star' : event === 'jazz' ? 'ev_lights_warm' : 'sk_lights_globe',
    bunting: event === 'adopt' ? 'ev_bunting_pink' : event === 'study' ? 'ev_bunting_sky' : event === 'latte' ? 'ev_bunting_sage' : null,
    sign: null,
    props, laptops: [], blocked: blockedOut,
  };
  const signKey = event === 'adopt' ? 'ev_sign_adopt' : event === 'jazz' ? 'ev_sign_jazz' : null;
  if (signKey) { // on the first stretch of back right wall with nothing standing in front of it; a small room may have none
    for (let x = 5; x + 2 <= size - 0.5; x++) {
      if (!inp.blocked.has(`${x},1`) && !inp.blocked.has(`${x + 1},1`)) { plan.sign = { key: signKey, wall: 'right', at: x }; break; }
    }
  }

  if (event === 'adopt') {
    const p = patchOf(2, size, inp.blocked, occupied);
    if (p) {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { used.add(`${p.x + i},${p.y + j}`); blockedOut.push(`${p.x + i},${p.y + j}`); }
      props.push({ key: 'ev_pen', tile: p, blocks: true, role: 'pen' });
      props.push({ key: 'ev_pets', tile: p, blocks: false, role: 'pets' });
      plan.sign = { key: 'ev_sign_adopt', wall: 'left', at: p.y }; // the adoption sign hangs on the wall above the pen
      const b = [{ x: p.x + 2, y: p.y + 1 }, { x: p.x + 2, y: p.y }, { x: p.x + 1, y: p.y + 2 }, { x: p.x, y: p.y + 2 }]
        .find((t) => free.some((f) => f.x === t.x && f.y === t.y) && !used.has(key(t)));
      claim('basket', 'ev_toy_basket', b ?? null, true);
    }
  } else if (event === 'study') {
    const tables = (inp.tables ?? []).slice().sort((a, b) => a.x + a.y - (b.x + b.y)).slice(0, 3);
    plan.laptops = tables;
    claim('power', 'ev_power_tile', spotNear(free, used), false);
    const r = inp.routers?.[0];
    claim('owl', 'ev_wifi_owl', spotNear(free, used, r ? { x: r.x + 1, y: r.y } : undefined), true);
  } else if (event === 'jazz') {
    claim('record', 'ev_record_player', spotNear(free, used), true);
  } else if (event === 'latte') {
    const c = inp.counters?.[0];
    claim('barrel', 'ev_chai_barrel', spotNear(free, used, c ? { x: c.x + 1, y: c.y + 1 } : undefined), true);
    const b = props[props.length - 1];
    claim('board', 'ev_chalkboard', b ? spotNear(free, used, { x: b.tile.x + 1, y: b.tile.y }) : null, true);
  }
  return plan;
}
