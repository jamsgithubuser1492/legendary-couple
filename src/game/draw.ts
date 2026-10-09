import Phaser from 'phaser';
import { cartesianToIso } from './iso';
import { footprint, itemOf, type CatalogItem } from '../state/catalog';
import type { PlacedObject } from '../types';

export function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * f));
  const b = Math.min(255, Math.round((color & 255) * f));
  return (r << 16) | (g << 8) | b;
}

type P = { x: number; y: number };
const world = (u: number, v: number, up = 0): P => {
  const p = cartesianToIso(u, v);
  return { x: p.x, y: p.y - up };
};

function poly(g: Phaser.GameObjects.Graphics, pts: P[], color: number, alpha: number) {
  g.fillStyle(color, alpha);
  g.lineStyle(1, 0xffffff, 0.55 * alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
  g.strokePath();
}

/** Isometric box centered on continuous tile coords (cx, cy), spanning w x d tiles. */
export function box(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, w: number, d: number,
  h: number, z: number, color: number, alpha = 1,
): void {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2;
  const back = [x0, y0], right = [x1, y0], front = [x1, y1], left = [x0, y1];
  const at = (c: number[], up: number) => world(c[0], c[1], up);
  poly(g, [at(left, z), at(front, z), at(front, z + h), at(left, z + h)], shade(color, 0.86), alpha);
  poly(g, [at(front, z), at(right, z), at(right, z + h), at(front, z + h)], shade(color, 0.72), alpha);
  poly(g, [at(back, z + h), at(right, z + h), at(front, z + h), at(left, z + h)], color, alpha);
}

export function diamond(g: Phaser.GameObjects.Graphics, x: number, y: number, w = 1, d = 1, inset = 0): void {
  const pts = [world(x + inset, y + inset), world(x + w - inset, y + inset), world(x + w - inset, y + d - inset), world(x + inset, y + d - inset)];
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
  g.closePath();
}

const WALL_T = 0.16;

/** Renders one wall piece, auto-connecting to neighbouring wall pieces. */
function drawWall(
  g: Phaser.GameObjects.Graphics,
  item: CatalogItem,
  o: PlacedObject,
  wallAt: (x: number, y: number) => boolean,
  alpha: number,
) {
  const cx = o.tileX + 0.5, cy = o.tileY + 0.5;
  const H = item.h;
  const W = wallAt(o.tileX - 1, o.tileY), E = wallAt(o.tileX + 1, o.tileY);
  const N = wallAt(o.tileX, o.tileY - 1), S = wallAt(o.tileX, o.tileY + 1);
  let w = W, e = E, n = N, s = S;
  if (!w && !e && !n && !s) {
    // isolated: rotation picks the axis
    if (o.rotation % 180 === 0) { w = true; e = true; } else { n = true; s = true; }
  }
  const layers = (px: number, py: number, bw: number, bd: number) => {
    if (item.variant === 'window') {
      box(g, px, py, bw, bd, 10, 0, item.color, alpha);
      box(g, px, py, bw, bd, 16, 10, 0xbfe6f2, alpha * 0.85);
      box(g, px, py, bw, bd, H - 26, 26, item.color, alpha);
    } else if (item.variant === 'door') {
      box(g, px, py, bw, bd, 28, 0, 0xb9854f, alpha);
      box(g, px, py, bw, bd, H - 28, 28, item.color, alpha);
    } else {
      box(g, px, py, bw, bd, H, 0, item.color, alpha);
    }
  };
  // back to front so overlaps sort correctly
  if (w) layers(cx - 0.25, cy, 0.5 + WALL_T / 2, WALL_T);
  if (n) layers(cx, cy - 0.25, WALL_T, 0.5 + WALL_T / 2);
  box(g, cx, cy, WALL_T, WALL_T, H, 0, shade(item.color, 0.97), alpha); // post caps the joint
  if (e) layers(cx + 0.25, cy, 0.5 + WALL_T / 2, WALL_T);
  if (s) layers(cx, cy + 0.25, WALL_T, 0.5 + WALL_T / 2);
}

function drawFurniture(g: Phaser.GameObjects.Graphics, item: CatalogItem, o: PlacedObject, alpha: number) {
  const { w, d } = footprint(item, o.rotation);
  const cx = o.tileX + w / 2, cy = o.tileY + d / 2;
  const m = 0.1;
  if (item.shape === 'tree') {
    box(g, cx, cy, 0.22, 0.22, 8, 0, 0x9c6b43, alpha);
    for (let i = 0; i < 3; i++) {
      const s = 0.62 - i * 0.18;
      box(g, cx, cy, s, s, 12, 6 + i * 11, shade(item.color, 1 + i * 0.08), alpha);
    }
    const star = world(cx, cy, item.h + 2);
    g.fillStyle(item.color2 ?? 0xffd84d, alpha);
    g.fillCircle(star.x, star.y, 3.5);
    return;
  }
  if (item.shape === 'round') {
    box(g, cx, cy, w - 0.4, d - 0.4, item.h * 0.7, 0, item.color, alpha);
    const top = world(cx, cy, item.h * 0.7 + 3);
    g.fillStyle(item.color2 ?? shade(item.color, 1.05), alpha);
    g.fillCircle(top.x, top.y, 7 + item.h * 0.1);
    if (item.id === 'plush_kitty' || item.id === 'lamp_miffy') {
      g.fillStyle(0x3b2a2a, alpha);
      g.fillCircle(top.x - 3, top.y, 1.1);
      g.fillCircle(top.x + 3, top.y, 1.1);
    }
    return;
  }
  box(g, cx, cy, w - m, d - m, item.h, 0, item.color, alpha);
  if (item.facing) {
    // headboard or backrest on the side picked by rotation
    const t = 0.22, hh = item.h + 10;
    const side = (o.rotation / 90) % 4;
    const inner = { w: w - m, d: d - m };
    if (side === 0) box(g, cx - inner.w / 2 + t / 2, cy, t, inner.d, hh, 0, item.color2 ?? item.color, alpha);
    if (side === 1) box(g, cx, cy - inner.d / 2 + t / 2, inner.w, t, hh, 0, item.color2 ?? item.color, alpha);
    if (side === 2) box(g, cx + inner.w / 2 - t / 2, cy, t, inner.d, hh, 0, item.color2 ?? item.color, alpha);
    if (side === 3) box(g, cx, cy + inner.d / 2 - t / 2, inner.w, t, hh, 0, item.color2 ?? item.color, alpha);
  }
}

export interface DrawCtx {
  wallAt: (x: number, y: number) => boolean;
  alpha?: number;
}

/** Draws any catalog item into a Graphics object and returns the depth to sort it at. */
export function drawPlaced(g: Phaser.GameObjects.Graphics, o: PlacedObject, ctx: DrawCtx): number {
  const item = itemOf(o.itemId);
  if (!item) return 0;
  const alpha = ctx.alpha ?? 1;
  const { w, d } = footprint(item, o.rotation);
  if (item.layer === 'floor') {
    const base = item.color;
    g.fillStyle(base, alpha);
    diamond(g, o.tileX, o.tileY, 1, 1, 0.03);
    g.fillPath();
    if (item.color2) {
      g.fillStyle(item.color2, alpha);
      for (const [dx, dy] of [[0, 0], [0.5, 0.5]]) {
        diamond(g, o.tileX + dx, o.tileY + dy, 0.5, 0.5, 0.03);
        g.fillPath();
      }
    }
    g.lineStyle(1, 0xffffff, 0.5 * alpha);
    diamond(g, o.tileX, o.tileY, 1, 1, 0.03);
    g.strokePath();
    return -30;
  }
  if (item.layer === 'wall') drawWall(g, item, o, ctx.wallAt, alpha);
  else drawFurniture(g, item, o, alpha);
  // sort by the front-most tile of the footprint so avatars pass in front or behind correctly
  return o.tileX + w - 1 + (o.tileY + d - 1) + (item.layer === 'wall' ? 0.6 : 0.4);
}
