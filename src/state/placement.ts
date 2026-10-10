import type { GameState } from '../types';
import { footprint, itemOf } from './catalog';
import { PRESET_ORDER, type Preset } from './presets';

export const ISLAND_STEPS: { size: number; coins: number }[] = [{ size: 12, coins: 500 }, { size: 14, coins: 1200 }, { size: 16, coins: 2500 }];
/** Tile occupied by the starting RV, shop or foundation. */
export const PLOT = { x: 4, y: 4 };
/** Where the Gratitude Tree grows. */
export const TREE = { x: 8, y: 1 };

export function tilesOf(itemId: string, x: number, y: number, rotation: number): { x: number; y: number }[] {
  const item = itemOf(itemId);
  if (!item) return [];
  const { w, d } = footprint(item, rotation);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push({ x: x + i, y: y + j });
  return out;
}

const hasWall = (s: GameState, x: number, y: number) =>
  s.placed.some((o) => o.tileX === x && o.tileY === y && itemOf(o.itemId)?.layer === 'wall');

/**
 * Which face of the wall piece at (x, y) a hanging decoration sits on:
 * 'x' is the back right edge, 'y' is the back left edge. Null when there is no wall.
 * Mirrors how the renderer picks a wall's direction, so decor always lands on the visible face.
 */
export function decorFace(s: GameState, x: number, y: number, rotation: number): 'x' | 'y' | null {
  const piece = s.placed.find((o) => o.tileX === x && o.tileY === y && itemOf(o.itemId)?.layer === 'wall');
  if (!piece) return null;
  const hasX = hasWall(s, x - 1, y) || hasWall(s, x + 1, y);
  const hasY = hasWall(s, x, y - 1) || hasWall(s, x, y + 1);
  if (hasX && hasY) return rotation % 180 === 0 ? 'x' : 'y'; // a corner has two faces, rotation picks one
  if (hasX) return 'x';
  if (hasY) return 'y';
  return piece.rotation % 180 === 0 ? 'x' : 'y';
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
  ignoreInventory = false,
): PlaceCheck {
  const item = itemOf(itemId);
  if (!item) return { ok: false, reason: 'Unknown item' };
  if (!ignoreInventory && (s.inventory.find((i) => i.id === itemId)?.count ?? 0) < 1) return { ok: false, reason: 'None left in your bag' };
  if (item.layer === 'walldecor') {
    const face = decorFace(s, x, y, rotation);
    if (!face) return { ok: false, reason: 'Hang this on a wall' };
    const taken = s.placed.some(
      (o) => itemOf(o.itemId)?.layer === 'walldecor' && o.tileX === x && o.tileY === y && decorFace(s, x, y, o.rotation) === face,
    );
    return taken ? { ok: false, reason: 'That wall spot is taken' } : { ok: true };
  }
  const tiles = tilesOf(itemId, x, y, rotation);
  for (const t of tiles) {
    if (t.x < 0 || t.y < 0 || t.x >= s.islandSize || t.y >= s.islandSize) return { ok: false, reason: 'Off the island' };
    if (item.layer !== 'floor') {
      if (t.x === TREE.x && t.y === TREE.y) return { ok: false, reason: 'The Gratitude Tree is there' };
      if (!s.starterRemoved && t.x === PLOT.x && t.y === PLOT.y) return { ok: false, reason: 'Your starter spot is in the way' };
      if (extraBlocked.some((b) => b.x === t.x && b.y === t.y)) return { ok: false, reason: 'Someone is standing there' };
    }
  }
  if (item.layer !== 'floor' && s.memories.some((m) => tiles.some((t) => t.x === m.tileX && t.y === m.tileY))) {
    return { ok: false, reason: 'A memory plaque is there' };
  }
  for (const o of s.placed) {
    const oi = itemOf(o.itemId);
    if (!oi || oi.layer === 'walldecor') continue;
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
  if (hasStarter && !s.starterRemoved) set.add(`${PLOT.x},${PLOT.y}`);
  set.add(`${TREE.x},${TREE.y}`);
  for (const o of s.placed) {
    const it = itemOf(o.itemId);
    if (!it || it.layer === 'floor' || it.layer === 'walldecor') continue;
    for (const t of tilesOf(o.itemId, o.tileX, o.tileY, o.rotation)) set.add(`${t.x},${t.y}`);
  }
  for (const m of s.memories) set.add(`${m.tileX},${m.tileY}`);
  return set;
}

/** Finds an open tile for a new memory plaque, preferring the island's shoreline. */
export function freeShoreTile(s: GameState, extra: { x: number; y: number }[] = []): { x: number; y: number } | null {
  const taken = blockedTiles(s, true);
  for (const t of extra) taken.add(`${t.x},${t.y}`);
  for (const a of Object.values(s.avatars)) taken.add(`${a.x},${a.y}`);
  const ring: { x: number; y: number }[] = [];
  const G = s.islandSize;
  for (let layer = 0; layer < G / 2; layer++) {
    const lo = layer, hi = G - 1 - layer;
    for (let i = lo; i <= hi; i++) ring.push({ x: i, y: lo }, { x: hi, y: i }, { x: G - 1 - i, y: hi }, { x: lo, y: G - 1 - i });
  }
  return ring.find((t) => !taken.has(`${t.x},${t.y}`)) ?? null;
}

/** Preset items in the order they must be laid: floors, walls, furniture, then wall decor. */
export function presetOrder(preset: Preset) {
  return [...preset.items].sort((a, b) => (PRESET_ORDER[itemLayer(a.itemId)] ?? 2) - (PRESET_ORDER[itemLayer(b.itemId)] ?? 2));
}
const itemLayer = (id: string) => itemOf(id)?.layer ?? 'object';

/** Checks that a whole room design fits at an anchor tile, laying each piece on top of the last. */
export function canPlacePreset(
  s: GameState, preset: Preset, x: number, y: number, extraBlocked: { x: number; y: number }[] = [],
): PlaceCheck {
  const temp: GameState = { ...s, placed: [...s.placed] };
  for (const [i, pi] of presetOrder(preset).entries()) {
    const check = canPlace(temp, pi.itemId, x + pi.dx, y + pi.dy, pi.rotation ?? 0, extraBlocked, true);
    if (!check.ok) return check;
    temp.placed.push({ id: `tmp${i}`, itemId: pi.itemId, tileX: x + pi.dx, tileY: y + pi.dy, rotation: pi.rotation ?? 0 });
  }
  return { ok: true };
}
