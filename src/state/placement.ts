import type { GameState } from '../types';
import { footprint, itemOf } from './catalog';

export const GRID = 10;
/** Tile occupied by the starting RV, shop or foundation. */
export const PLOT = { x: 4, y: 4 };

export function tilesOf(itemId: string, x: number, y: number, rotation: number): { x: number; y: number }[] {
  const item = itemOf(itemId);
  if (!item) return [];
  const { w, d } = footprint(item, rotation);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push({ x: x + i, y: y + j });
  return out;
}

export type PlaceCheck = { ok: true } | { ok: false; reason: string };

/** Validates a placement against bounds, the starting plot, and existing objects. */
export function canPlace(
  s: GameState,
  itemId: string,
  x: number,
  y: number,
  rotation: number,
  extraBlocked: { x: number; y: number }[] = [],
): PlaceCheck {
  const item = itemOf(itemId);
  if (!item) return { ok: false, reason: 'Unknown item' };
  if ((s.inventory.find((i) => i.id === itemId)?.count ?? 0) < 1) return { ok: false, reason: 'None left in your bag' };
  const tiles = tilesOf(itemId, x, y, rotation);
  for (const t of tiles) {
    if (t.x < 0 || t.y < 0 || t.x >= GRID || t.y >= GRID) return { ok: false, reason: 'Off the island' };
    if (item.layer !== 'floor') {
      if (t.x === PLOT.x && t.y === PLOT.y) return { ok: false, reason: 'Your starter spot is in the way' };
      if (extraBlocked.some((b) => b.x === t.x && b.y === t.y)) return { ok: false, reason: 'Someone is standing there' };
    }
  }
  if (item.layer !== 'floor' && s.memories.some((m) => tiles.some((t) => t.x === m.tileX && t.y === m.tileY))) {
    return { ok: false, reason: 'A memory plaque is there' };
  }
  for (const o of s.placed) {
    const oi = itemOf(o.itemId);
    if (!oi) continue;
    const occupied = tilesOf(o.itemId, o.tileX, o.tileY, o.rotation);
    const sameLayer = (oi.layer === 'floor') === (item.layer === 'floor');
    if (!sameLayer) continue;
    if (occupied.some((a) => tiles.some((b) => a.x === b.x && a.y === b.y))) return { ok: false, reason: 'Spot already taken' };
  }
  return { ok: true };
}

/** Tiles an avatar cannot walk through. */
export function blockedTiles(s: GameState, hasStarter: boolean): Set<string> {
  const set = new Set<string>();
  if (hasStarter) set.add(`${PLOT.x},${PLOT.y}`);
  for (const o of s.placed) {
    const it = itemOf(o.itemId);
    if (!it || it.layer === 'floor') continue;
    for (const t of tilesOf(o.itemId, o.tileX, o.tileY, o.rotation)) set.add(`${t.x},${t.y}`);
  }
  for (const m of s.memories) set.add(`${m.tileX},${m.tileY}`);
  return set;
}

/** Finds an open tile for a new memory plaque, preferring the island's shoreline. */
export function freeShoreTile(s: GameState): { x: number; y: number } | null {
  const taken = blockedTiles(s, true);
  for (const a of Object.values(s.avatars)) taken.add(`${a.x},${a.y}`);
  const ring: { x: number; y: number }[] = [];
  for (let layer = 0; layer < GRID / 2; layer++) {
    const lo = layer, hi = GRID - 1 - layer;
    for (let i = lo; i <= hi; i++) ring.push({ x: i, y: lo }, { x: hi, y: i }, { x: GRID - 1 - i, y: hi }, { x: lo, y: GRID - 1 - i });
  }
  return ring.find((t) => !taken.has(`${t.x},${t.y}`)) ?? null;
}
