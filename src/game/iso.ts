export const TILE_W = 64;
export const TILE_H = 32;
export const TILE_W_HALF = TILE_W / 2;
export const TILE_H_HALF = TILE_H / 2;
export const GRID_SIZE = 10;

/** Cartesian tile coords to isometric world coords (the diamond's top vertex). */
export function cartesianToIso(x: number, y: number): { x: number; y: number } {
  return { x: (x - y) * TILE_W_HALF, y: (x + y) * TILE_H_HALF };
}

/** Isometric world coords back to continuous cartesian tile coords. */
export function isoToCartesian(isoX: number, isoY: number): { x: number; y: number } {
  return {
    x: (isoX / TILE_W_HALF + isoY / TILE_H_HALF) / 2,
    y: (isoY / TILE_H_HALF - isoX / TILE_W_HALF) / 2,
  };
}

/** World position of the visual center of a tile. */
export function tileCenter(x: number, y: number): { x: number; y: number } {
  const p = cartesianToIso(x, y);
  return { x: p.x, y: p.y + TILE_H_HALF };
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
}

/** 4-directional BFS path on the grid, avoiding blocked tiles. Excludes the start tile. */
export function findPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  blocked: Set<string>,
): { x: number; y: number }[] {
  const key = (x: number, y: number) => `${x},${y}`;
  if (blocked.has(key(to.x, to.y))) return [];
  const prev = new Map<string, string | null>([[key(from.x, from.y), null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === to.x && cur.y === to.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (!inBounds(nx, ny) || blocked.has(k) || prev.has(k)) continue;
      prev.set(k, key(cur.x, cur.y));
      queue.push({ x: nx, y: ny });
    }
  }
  if (!prev.has(key(to.x, to.y))) return [];
  const path: { x: number; y: number }[] = [];
  let k: string | null = key(to.x, to.y);
  while (k && k !== key(from.x, from.y)) {
    const [px, py] = k.split(',').map(Number);
    path.unshift({ x: px, y: py });
    k = prev.get(k) ?? null;
  }
  return path;
}
