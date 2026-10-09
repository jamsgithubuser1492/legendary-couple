import Phaser from 'phaser';
import { cartesianToIso } from '../iso';
import { shade } from '../draw';
import type { Theme } from '../../state/season';

type G = Phaser.GameObjects.Graphics;
export type Pt = { x: number; y: number };

export const hash2 = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Smooth value noise in 0..1. */
export function noise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
export const fbm = (x: number, y: number) => noise(x, y) * 0.6 + noise(x * 2.1, y * 2.1) * 0.28 + noise(x * 4.3, y * 4.3) * 0.12;

export const mixColor = (a: number, b: number, t: number) => {
  const f = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (f(16) << 16) | (f(8) << 8) | f(0);
};

/** Smooth curve through points, using a Catmull-Rom spline. Points in, points out, same space. */
export function splinePts(pts: Pt[], divisions: number): Pt[] {
  const sp = new Phaser.Curves.Spline(pts.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
  return sp.getPoints(divisions).map((v) => ({ x: v.x, y: v.y }));
}

export const proj = (p: Pt): Pt => cartesianToIso(p.x, p.y);

export function fillPoly(g: G, pts: Pt[], color: number, alpha = 1) {
  if (pts.length < 3) return;
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

export function strokePoly(g: G, pts: Pt[], width: number, color: number, alpha = 1, closed = false) {
  if (pts.length < 2) return;
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (closed) g.closePath();
  g.strokePath();
}

/** A rounded rectangle outline in tile coordinates. */
export function roundedRect(x0: number, y0: number, x1: number, y1: number, r: number, seg = 6): Pt[] {
  const out: Pt[] = [];
  const corners: [number, number, number][] = [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]];
  for (const [cx, cy, a0] of corners)
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  return out;
}

/** Soft edged colour area: stacked rounded rects that grow slightly, so the edge feathers out. */
export function feather(g: G, x0: number, y0: number, x1: number, y1: number, r: number, color: number, alpha: number, soft = 1.6) {
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const grow = soft * (1 - i / layers);
    fillPoly(g, roundedRect(x0 - grow, y0 - grow, x1 + grow, y1 + grow, r + grow, 5).map(proj), color, alpha / 2.2);
  }
}

// ---------- trees ----------
export const TREE_COLORS: Record<Theme, number[][]> = {
  spring: [[0x6fae5e, 0x86c571, 0xb2e08c], [0x6aa85c, 0x80be6e, 0xa8d88a], [0x72b060, 0x88c874, 0xb6e290], [0xe49ab4, 0xf2b6cb, 0xffd6e2]],
  summer: [[0x56a05a, 0x6cba6a, 0x9ad68a], [0x4f9a5e, 0x66b46c, 0x92d08a]],
  autumn: [[0x5f9a58, 0x78b468, 0xa2d080], [0x5a9456, 0x72ae64, 0x9cc87c], [0x6a9a52, 0x84b462, 0xb0d078], [0xc47038, 0xe08c48, 0xf4b868], [0xb2503a, 0xd46c40, 0xf08a5a]],
  winter: [[0x4d7a64, 0x628f78, 0xe8f0f6], [0x45705c, 0x5a8570, 0xdce8f0]],
  holidays: [[0x3f7a58, 0x56906c, 0xe8f0f6], [0x45705c, 0x5a8570, 0xdce8f0]],
};

/** A rounded, painterly tree: soft shadow, short trunk, three overlapping crowns. */
export function drawCanopy(g: G, sx: number, sy: number, r: number, c: number[]) {
  g.fillStyle(0x24402c, 0.16);
  g.fillEllipse(sx + r * 0.2, sy + 1, r * 1.9, r * 0.75);
  g.fillStyle(0x8a6244, 1);
  g.fillRect(sx - r * 0.1, sy - r * 0.7, r * 0.2, r * 0.8);
  g.fillStyle(c[0], 1);
  g.fillCircle(sx + r * 0.18, sy - r * 1.0, r * 0.98);
  g.fillStyle(c[1], 1);
  g.fillCircle(sx - r * 0.08, sy - r * 1.22, r * 0.9);
  g.fillStyle(c[2], 0.95);
  g.fillCircle(sx - r * 0.3, sy - r * 1.5, r * 0.5);
}

/** A leaning palm with curved fronds. */
export function drawPalmTree(g: G, sx: number, sy: number, lean: number) {
  g.fillStyle(0x24402c, 0.14);
  g.fillEllipse(sx, sy + 1, 17, 6);
  g.lineStyle(2.6, 0x9c7a54, 1);
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + lean * 0.4, sy - 10);
  g.lineTo(sx + lean * 0.8, sy - 22);
  g.strokePath();
  const top = { x: sx + lean * 0.8, y: sy - 22 };
  for (let i = 0; i < 7; i++) {
    const a = (Math.PI * 2 * i) / 7 + lean * 0.05;
    const tip = { x: top.x + Math.cos(a) * 13, y: top.y + Math.sin(a) * 6 + 4 };
    const mid = { x: top.x + Math.cos(a) * 7, y: top.y + Math.sin(a) * 4 - 2 };
    g.lineStyle(2.4, i % 2 ? 0x4f9a5c : 0x66b270, 1);
    g.beginPath();
    g.moveTo(top.x, top.y);
    g.lineTo(mid.x, mid.y);
    g.lineTo(tip.x, tip.y);
    g.strokePath();
  }
  g.fillStyle(0x7a5a38, 1);
  g.fillCircle(top.x, top.y + 1, 2.2);
}

// ---------- mountains ----------
function curve(a: Pt, c: Pt, b: Pt, n = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
  }
  return out;
}

/** A painted mountain with curved slopes, a lit side, a shaded side and a jagged snow cap. */
export function drawMountain(g: G, bx: number, by: number, w: number, h: number, theme: Theme, haze: number, seed: number) {
  const winter = theme === 'winter' || theme === 'holidays';
  const rock = mixColor(theme === 'autumn' ? 0x9a8670 : 0x8f8a88, 0xe6ecf4, haze);
  const apex = { x: bx + w * (0.04 + (hash2(seed, 1) - 0.5) * 0.1), y: by - h };
  const L = { x: bx - w / 2, y: by }, R = { x: bx + w / 2, y: by };
  const left = curve(L, { x: bx - w * 0.2, y: by - h * 0.42 }, apex);
  const right = curve(apex, { x: bx + w * 0.22, y: by - h * 0.46 }, R);
  const base = { x: bx + w * 0.03, y: by + h * 0.07 };
  fillPoly(g, [...left, ...right.slice(1), base], shade(rock, 0.8)); // shaded side first
  // lit side: from the apex down the left slope and back along a ridge
  const ridge: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    ridge.push({ x: apex.x + (base.x - apex.x) * t + Math.sin(t * 9 + seed) * w * 0.012, y: apex.y + (base.y - apex.y) * t });
  }
  fillPoly(g, [...left, base, ...ridge.reverse()], shade(rock, 1.12));
  // a few crevices
  g.lineStyle(1.4, shade(rock, 0.62), 0.35);
  for (let k = 0; k < 4; k++) {
    const t = 0.3 + k * 0.17;
    g.beginPath();
    g.moveTo(apex.x + (hash2(seed, k) - 0.5) * w * 0.05, apex.y + h * 0.18);
    g.lineTo(apex.x - w * (0.08 + 0.1 * t) * (k % 2 ? -1 : 1), apex.y + h * (0.35 + t * 0.4));
    g.strokePath();
  }
  // snow cap with a jagged edge
  const snowTop = winter ? 0.45 : 0.62;
  const edge = (arr: Pt[]) => arr.filter((p) => by - p.y > h * snowTop);
  const ls = edge(left), rs = edge(right);
  if (ls.length > 1 && rs.length > 1) {
    const a = ls[0], b = rs[rs.length - 1];
    const zig: Pt[] = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      zig.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + (i % 2 ? h * 0.05 : -h * 0.015) });
    }
    fillPoly(g, [...ls, ...rs, ...zig.reverse()], mixColor(0xf4f7fb, 0xdfe7f2, haze * 0.6));
    const mid = Math.floor((ls.length + rs.length) / 2);
    fillPoly(g, [apex, ...rs.slice(0, Math.max(2, mid - ls.length + 4)), { x: apex.x + w * 0.02, y: apex.y + h * 0.32 }], 0xd4deec, 0.7);
  }
  // soft foothills of green at the base
  g.fillStyle(mixColor(0x7aa86a, 0xe6ecf4, haze), 0.55);
  g.fillEllipse(bx, by + h * 0.04, w * 0.95, h * 0.2);
}

/** A wooden pier: planked deck, side rails and posts standing in the water. */
export function drawPier(g: G, x0: number, y0: number, x1: number, y1: number, width: number) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const hw = width / 2;
  const P = (t: number, o: number, up = 0): Pt => {
    const s = cartesianToIso(x0 + ux * t + nx * o, y0 + uy * t + ny * o);
    return { x: s.x, y: s.y - up };
  };
  // posts and their shadows
  for (let t = 0.5; t < len; t += 1.4) {
    for (const o of [-hw, hw]) {
      const a = P(t, o, 0), b = P(t, o, -14);
      g.fillStyle(0x3a2a20, 0.2);
      g.fillEllipse(a.x, a.y + 6, 9, 3);
      g.lineStyle(3, 0x6e5240, 1);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
  }
  // deck: a thick edge, then the planks
  fillPoly(g, [P(0, -hw), P(len, -hw), P(len, hw), P(0, hw)].map((p) => ({ x: p.x, y: p.y + 5 })), 0x8a6a4c);
  fillPoly(g, [P(0, -hw), P(len, -hw), P(len, hw), P(0, hw)], 0xd9b88a);
  g.lineStyle(1, 0xb08c60, 0.55);
  for (let t = 0.3; t < len; t += 0.3) {
    const a = P(t, -hw), b = P(t, hw);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.strokePath();
  }
  strokePoly(g, [P(0, -hw), P(len, -hw)], 2, 0xf2dcb4, 0.9);
  strokePoly(g, [P(0, hw), P(len, hw)], 2, 0xa88458, 0.9);
}
