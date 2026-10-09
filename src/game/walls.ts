import Phaser from 'phaser';
import { cartesianToIso } from './iso';
import { shade } from './draw';

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

/**
 * Draws one piece of wall as a continuous plastered surface with a wooden skirting and cap.
 * Neighbouring pieces share their end points exactly, so a run of walls reads as one long wall,
 * and only the free ends and corners get closed off.
 */
export function drawWall(
  g: G, x: number, y: number, variant: 'wall' | 'window' | 'door', rotation: number, n: Neighbours, alpha = 1, tint?: number,
): void {
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

  const dress = (a: [number, number], b: [number, number], light: number, withOpening: boolean) => {
    quad(g, face(a, b, 0, WALL_H), col(shade(PLASTER, light)), alpha);
    quad(g, face(a, b, 0, 7), col(shade(WOOD, light)), alpha); // skirting
    quad(g, face(a, b, WALL_H - 4, WALL_H), col(shade(TRIM, light)), alpha); // cap trim
    if (withOpening && variant === 'window') {
      quad(g, face(a, b, 17, 50, 0.16, 0.84), col(shade(WOOD, light)), alpha); // frame
      quad(g, face(a, b, 20, 47, 0.2, 0.8), col(shade(GLASS, light)), alpha);
      quad(g, face(a, b, 20, 33, 0.2, 0.8), col(shade(0xe4f4fa, light)), alpha * 0.7);
      quad(g, face(a, b, 19, 48, 0.49, 0.51), col(shade(WOOD, light)), alpha); // mullions
      quad(g, face(a, b, 32, 34.5, 0.2, 0.8), col(shade(WOOD, light)), alpha);
      quad(g, face(a, b, 14, 18, 0.12, 0.88), col(shade(TRIM, light)), alpha); // sill
    }
    if (withOpening && variant === 'door') {
      quad(g, face(a, b, 0, 54, 0.16, 0.84), col(shade(WOOD, light * 0.95)), alpha); // frame
      quad(g, face(a, b, 0, 50, 0.2, 0.8), col(shade(DOOR, light)), alpha);
      quad(g, face(a, b, 30, 46, 0.3, 0.7), col(shade(GLASS, light)), alpha * 0.9); // little window
      quad(g, face(a, b, 6, 26, 0.3, 0.7), col(shade(DOOR, light * 0.88)), alpha); // lower panel
      const h = at(a[0] + (b[0] - a[0]) * 0.7, a[1] + (b[1] - a[1]) * 0.7, 24);
      g.fillStyle(col(0x6a4a30), alpha);
      g.fillCircle(h.x, h.y, 1.8);
    }
  };

  if (runY) {
    const a: [number, number] = [x + T, y + 1 + (n.S ? e : 0)], b: [number, number] = [x + T, y - (n.N ? e : 0)];
    dress(a, b, 0.86, !corner); // the face turned toward +x
    if (!n.S) quad(g, face([x, y + 1], [x + T, y + 1], 0, WALL_H), col(shade(PLASTER, 0.97)), alpha); // free end
    quad(g, [at(x, y + 1 + (n.S ? e : 0), WALL_H), at(x + T, y + 1 + (n.S ? e : 0), WALL_H), at(x + T, y - (n.N ? e : 0), WALL_H), at(x, y - (n.N ? e : 0), WALL_H)], col(shade(TRIM, 1.08)), alpha);
  }
  if (runX) {
    const a: [number, number] = [x - (n.W ? e : 0), y + T], b: [number, number] = [x + 1 + (n.E ? e : 0), y + T];
    dress(a, b, 0.98, !corner); // the face turned toward +y
    if (!n.E) quad(g, face([x + 1, y], [x + 1, y + T], 0, WALL_H), col(shade(PLASTER, 0.78)), alpha); // free end
    quad(g, [at(x - (n.W ? e : 0), y, WALL_H), at(x + 1 + (n.E ? e : 0), y, WALL_H), at(x + 1 + (n.E ? e : 0), y + T, WALL_H), at(x - (n.W ? e : 0), y + T, WALL_H)], col(shade(TRIM, 1.08)), alpha);
  }
}
