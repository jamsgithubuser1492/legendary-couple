import Phaser from 'phaser';
import { cartesianToIso } from './iso';
import { shade } from './draw';
import { getTheme } from '../state/season';

type P = { x: number; y: number };
type G = Phaser.GameObjects.Graphics;

export const WALL_H = 58;
const T = 0.13; // wall thickness in tiles
const PLASTER = 0xf7ecdb;
const WOOD = 0xdcab74;
const TRIM = 0xe9c08c;
const GLASS = 0xcfeaf5;
const DOOR = 0xc98e58;

const at = (u: number, v: number, up = 0): P => {
  const p = cartesianToIso(u, v);
  return { x: p.x, y: p.y - up };
};

const mix = (a: number, b: number, t: number) => {
  const f = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (f(16) << 16) | (f(8) << 8) | f(0);
};

function quad(g: G, pts: P[], color: number, alpha: number) {
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

export interface Neighbours {
  W: boolean;
  E: boolean;
  N: boolean;
  S: boolean;
}

export type WallMaterial = 'seasonal' | 'plaster' | 'pink' | 'sage' | 'brick' | 'batten' | 'wainscot' | 'picket' | 'hedge' | 'glass';
type Pattern = 'brick' | 'batten' | 'wainscot' | 'picket' | 'hedge' | 'glass';
interface Mat { plaster: number; trim: number; wood: number; h: number; pattern?: Pattern; accent?: number; opening: boolean }

/** Wall materials from the painted sheet: the colours and surfaces are yours, drawn on the game's own isometric wall shape. */
type FixedMat = Exclude<WallMaterial, 'seasonal'>;
const SEASON_MATS: Record<'spring' | 'summer' | 'autumn' | 'winter', Mat> = {
  spring: { plaster: 0xcbe3b6, trim: 0xb2d49a, wood: 0x9cc084, h: WALL_H, opening: true },
  summer: { plaster: 0xf4d78a, trim: 0xe9c066, wood: 0xd4a44a, h: WALL_H, opening: true },
  autumn: { plaster: 0xdc9a5c, trim: 0xc7803f, wood: 0xa8652e, h: WALL_H, opening: true },
  winter: { plaster: 0xeef3f8, trim: 0xd6e1ec, wood: 0xbccbdb, h: WALL_H, opening: true },
};
const MATS: Record<FixedMat, Mat> = {
  plaster: { plaster: PLASTER, trim: TRIM, wood: WOOD, h: WALL_H, opening: true },
  pink: { plaster: 0xf8cfdc, trim: 0xf2b5c8, wood: 0xe7a3b8, h: WALL_H, opening: true },
  sage: { plaster: 0xbcd6aa, trim: 0xa4c492, wood: 0x8fb27f, h: WALL_H, opening: true },
  brick: { plaster: 0xc9725a, trim: 0xb4604b, wood: 0x9b4e3c, h: WALL_H, pattern: 'brick', accent: 0xe8c9b8, opening: true },
  batten: { plaster: 0xf2d3b0, trim: 0xdcab74, wood: 0xc4914f, h: WALL_H, pattern: 'batten', accent: 0xb98250, opening: true },
  wainscot: { plaster: 0xf3e6d2, trim: 0xe3d4bb, wood: 0xcdbf9f, h: WALL_H, pattern: 'wainscot', accent: 0xdccdb2, opening: true },
  picket: { plaster: 0xf8f4ec, trim: 0xffffff, wood: 0xe8e2d6, h: 32, pattern: 'picket', opening: false },
  hedge: { plaster: 0x6aa04c, trim: 0x7cb55a, wood: 0x4f8a3a, h: 36, pattern: 'hedge', opening: false },
  glass: { plaster: 0xcfeaf5, trim: 0xb48a5c, wood: 0xb48a5c, h: WALL_H, pattern: 'glass', opening: false },
};
const hash2 = (a: number, b: number) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

/**
 * Draws one piece of wall as a continuous surface with a skirting and cap.
 * Neighbouring pieces share their end points exactly, so a run of walls reads as one long wall,
 * and only the free ends and corners get closed off. T junctions and crosses come for free.
 */
export function drawWall(
  g: G, x: number, y: number, variant: 'wall' | 'window' | 'door', rotation: number, n: Neighbours, alpha = 1, tint?: number, material: WallMaterial = 'plaster',
): void {
  const th = getTheme();
  const mat = material === 'seasonal' ? SEASON_MATS[th === 'holidays' ? 'winter' : th] : MATS[material] ?? MATS.plaster;
  const H = mat.h;
  const col = (c: number) => (tint === undefined ? c : mix(c, tint, 0.55));
  const hasX = n.W || n.E, hasY = n.N || n.S;
  const corner = hasX && hasY;
  const isolated = !hasX && !hasY;
  const runX = hasX || (isolated && rotation % 180 === 0);
  const runY = hasY || (isolated && rotation % 180 !== 0);
  const e = 0.012; // overlap with joined neighbours so no hairline shows

  // a wall face along a tile edge: from a to b (tile coords), between heights v0 and v1
  const face = (a: [number, number], b: [number, number], v0: number, v1: number, u0 = 0, u1 = 1): P[] => {
    const lerp = (t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const p = lerp(u0), q = lerp(u1);
    return [at(p[0], p[1], v0), at(q[0], q[1], v0), at(q[0], q[1], v1), at(p[0], p[1], v1)];
  };
  const pt = (a: [number, number], b: [number, number], u: number, v: number): P => at(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, v);

  const dress = (a: [number, number], b: [number, number], light: number, withOpening: boolean, seed: number) => {
    const c = (base: number) => col(shade(base, light));
    const pat = mat.pattern;
    if (pat === 'picket') {
      const N = 7;
      for (let k = 0; k < N; k++) {
        const u0 = (k + 0.1) / N, u1 = (k + 0.9) / N;
        quad(g, face(a, b, 0, H - 5, u0, u1), c(mat.plaster), alpha);
        const tip = pt(a, b, (u0 + u1) / 2, H), l = pt(a, b, u0, H - 5), r = pt(a, b, u1, H - 5);
        quad(g, [l, r, tip], c(shade(mat.plaster, 1.04)), alpha);
      }
      quad(g, face(a, b, 6, 9), c(mat.wood), alpha);
      quad(g, face(a, b, 19, 22), c(mat.wood), alpha);
      return;
    }
    if (pat === 'hedge') {
      quad(g, face(a, b, 0, H - 4), c(mat.plaster), alpha);
      for (let i = 0; i < 16; i++) {
        const u = 0.04 + hash2(seed, i) * 0.92, v = 3 + hash2(i, seed) * (H - 8);
        const p = pt(a, b, u, v);
        g.fillStyle(c(i % 3 ? mat.trim : mat.wood), alpha * 0.85);
        g.fillCircle(p.x, p.y, 3.2 + hash2(i, 5) * 3);
      }
      for (let i = 0; i < 6; i++) {
        const p = pt(a, b, (i + 0.5) / 6, H - 4);
        g.fillStyle(c(mat.trim), alpha);
        g.fillCircle(p.x, p.y, 5);
      }
      return;
    }
    if (pat === 'glass') {
      quad(g, face(a, b, 0, H), c(mat.wood), alpha); // frame
      for (let k = 0; k < 3; k++) {
        const u0 = (k + 0.07) / 3, u1 = (k + 0.93) / 3;
        quad(g, face(a, b, 5, H - 5, u0, u1), c(mat.plaster), alpha * 0.85);
        quad(g, face(a, b, H * 0.55, H - 5, u0, u1), c(0xe8f6fb), alpha * 0.6);
      }
      return;
    }
    quad(g, face(a, b, 0, H), c(mat.plaster), alpha);
    if (pat === 'brick') {
      const rows = 9;
      for (let r = 0; r < rows; r++) {
        const v0 = (r * H) / rows;
        quad(g, face(a, b, v0, v0 + 0.9), c(mat.accent!), alpha * 0.8);
        for (let k = 0; k < 5; k++) {
          const u = (k + (r % 2 ? 0.5 : 0)) / 5 + 0.01;
          if (u > 0.985) continue;
          quad(g, face(a, b, v0, v0 + H / rows, u, u + 0.022), c(mat.accent!), alpha * 0.9);
        }
      }
    } else if (pat === 'batten') {
      for (let k = 0; k < 5; k++) quad(g, face(a, b, 7, H - 4, (k + 0.43) / 5, (k + 0.57) / 5), c(mat.accent!), alpha);
      quad(g, face(a, b, H * 0.45, H * 0.45 + 2), c(mat.accent!), alpha);
    } else if (pat === 'wainscot') {
      quad(g, face(a, b, 0, 26), c(mat.accent!), alpha);
      for (let k = 1; k < 10; k++) quad(g, face(a, b, 7, 24, k / 10 - 0.006, k / 10 + 0.006), c(shade(mat.accent!, 0.88)), alpha);
      quad(g, face(a, b, 24, 27.5), c(mat.trim), alpha);
    }
    quad(g, face(a, b, 0, 7), c(mat.wood), alpha); // skirting
    quad(g, face(a, b, H - 4, H), c(mat.trim), alpha); // cap trim
    if (withOpening && mat.opening && variant === 'window') {
      quad(g, face(a, b, 17, 50, 0.16, 0.84), c(WOOD), alpha); // frame
      quad(g, face(a, b, 20, 47, 0.2, 0.8), c(GLASS), alpha);
      quad(g, face(a, b, 20, 33, 0.2, 0.8), c(0xe4f4fa), alpha * 0.7);
      quad(g, face(a, b, 19, 48, 0.49, 0.51), c(WOOD), alpha); // mullions
      quad(g, face(a, b, 32, 34.5, 0.2, 0.8), c(WOOD), alpha);
      quad(g, face(a, b, 14, 18, 0.12, 0.88), c(TRIM), alpha); // sill
    }
    if (withOpening && mat.opening && variant === 'door') {
      quad(g, face(a, b, 0, 54, 0.16, 0.84), c(WOOD * 0.95), alpha); // frame
      quad(g, face(a, b, 0, 50, 0.2, 0.8), c(DOOR), alpha);
      quad(g, face(a, b, 30, 46, 0.3, 0.7), c(GLASS), alpha * 0.9); // little window
      quad(g, face(a, b, 6, 26, 0.3, 0.7), c(shade(DOOR, 0.88)), alpha); // lower panel
      const h = at(a[0] + (b[0] - a[0]) * 0.7, a[1] + (b[1] - a[1]) * 0.7, 24);
      g.fillStyle(col(0x6a4a30), alpha);
      g.fillCircle(h.x, h.y, 1.8);
    }
  };
  const open = mat.pattern !== 'picket' && mat.pattern !== 'hedge' && mat.pattern !== 'glass'; // fences have free ends only through their cap
  const endCap = (a: [number, number], b: [number, number], light: number) => {
    if (mat.pattern === 'picket') return;
    quad(g, face(a, b, 0, H), col(shade(mat.pattern === 'hedge' ? mat.plaster : mat.plaster, light)), alpha);
  };
  const cap = (pts: P[]) => {
    if (mat.pattern === 'picket') return;
    quad(g, pts, col(shade(mat.trim, 1.08)), alpha);
  };
  void open;

  if (runY) {
    const a: [number, number] = [x + T, y + 1 + (n.S ? e : 0)], b: [number, number] = [x + T, y - (n.N ? e : 0)];
    dress(a, b, 0.86, !corner, x * 7 + y);
    if (!n.S) endCap([x, y + 1], [x + T, y + 1], 0.97);
    cap([at(x, y + 1 + (n.S ? e : 0), H), at(x + T, y + 1 + (n.S ? e : 0), H), at(x + T, y - (n.N ? e : 0), H), at(x, y - (n.N ? e : 0), H)]);
  }
  if (runX) {
    const a: [number, number] = [x - (n.W ? e : 0), y + T], b: [number, number] = [x + 1 + (n.E ? e : 0), y + T];
    dress(a, b, 0.98, !corner, x * 3 + y * 5);
    if (!n.E) endCap([x + 1, y], [x + 1, y + T], 0.78);
    cap([at(x - (n.W ? e : 0), y, H), at(x + 1 + (n.E ? e : 0), y, H), at(x + 1 + (n.E ? e : 0), y + T, H), at(x - (n.W ? e : 0), y + T, H)]);
  }
}
