import Phaser from 'phaser';
import { box, shade } from '../draw';
import { cartesianToIso } from '../iso';

type G = Phaser.GameObjects.Graphics;

const WALLS = [0xffd9c4, 0xcfe8d8, 0xe0d4f0, 0xfff0b8, 0xf8c8d8, 0xc8e0f0];
const ROOFS = [0xd98a7a, 0x8fb59a, 0xa896c8, 0xd9b45a, 0xd878a0, 0x7ea8c8];
const TOWERS = [0xc8d4e4, 0xe4d4cc, 0xd0dcc8, 0xdcd0e4];

/** Lit windows on the two visible faces of a box. */
function windows(g: G, cx: number, cy: number, w: number, d: number, cols: number, rows: number, v0: number, rowH: number, color: number) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2;
  const pt = (u: number, v: number, a: number[], b: number[]) => {
    const p = cartesianToIso(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u);
    return { x: p.x, y: p.y - v };
  };
  const faces: [number[], number[], number][] = [[[x0, y1], [x1, y1], 1], [[x1, y1], [x1, y0], 0.82]]; // left face, right face
  for (const [a, b, light] of faces) {
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const u0 = (c + 0.25) / cols, u1 = (c + 0.75) / cols;
        const v0r = v0 + r * rowH, v1r = v0r + rowH * 0.55;
        const quad = [pt(u0, v0r, a, b), pt(u1, v0r, a, b), pt(u1, v1r, a, b), pt(u0, v1r, a, b)];
        g.fillStyle(shade(color, light), 0.95);
        g.beginPath();
        g.moveTo(quad[0].x, quad[0].y);
        quad.slice(1).forEach((q) => g.lineTo(q.x, q.y));
        g.closePath();
        g.fillPath();
      }
  }
}

/** A cozy pastel house with a stepped roof, chimney and lit windows. */
export function drawHouse(g: G, cx: number, cy: number, variant: number) {
  const wall = WALLS[variant % WALLS.length], roof = ROOFS[variant % ROOFS.length];
  box(g, cx, cy, 1.4, 1.4, 22, 0, wall);
  windows(g, cx, cy, 1.4, 1.4, 2, 1, 8, 12, 0xfff6c8);
  box(g, cx, cy, 1.6, 1.6, 6, 22, roof);
  box(g, cx, cy, 1.1, 1.1, 6, 28, shade(roof, 1.08));
  box(g, cx, cy, 0.6, 0.6, 5, 34, shade(roof, 1.15));
  box(g, cx + 0.3, cy - 0.25, 0.18, 0.18, 12, 22, 0xb06a52); // chimney
}

/** A boxy generic tower for downtown. Variant picks colour and height. */
export function drawTower(g: G, cx: number, cy: number, variant: number) {
  const h = 54 + (variant % 4) * 16;
  const c = TOWERS[variant % TOWERS.length];
  box(g, cx, cy, 1.6, 1.6, h, 0, c);
  windows(g, cx, cy, 1.6, 1.6, 4, Math.floor(h / 14) - 1, 8, 14, 0xa8d4ec);
  box(g, cx, cy, 1.7, 1.7, 4, h, shade(c, 0.85));
  box(g, cx, cy, 0.7, 0.7, 7, h + 4, shade(c, 0.92));
}

/** A red barn with white trim. */
export function drawBarn(g: G, cx: number, cy: number, variant: number) {
  const red = variant % 2 ? 0xd9755f : 0xc9604e;
  box(g, cx, cy, 1.6, 1.4, 20, 0, red);
  box(g, cx, cy, 0.5, 0.06, 14, 0, 0xfff4ee); // door trim
  box(g, cx, cy, 1.75, 1.55, 6, 20, 0xb0a09a);
  box(g, cx, cy, 1.2, 1.1, 6, 26, 0xc0b0aa);
}

/** A round leafy tree. */
export function drawTree(g: G, cx: number, cy: number, variant: number) {
  const leaf = [0x8fcf7a, 0x7fc47a, 0xa8d880][variant % 3];
  box(g, cx, cy, 0.18, 0.18, 14, 0, 0x9c6b43);
  const top = cartesianToIso(cx, cy);
  g.fillStyle(shade(leaf, 0.85), 1);
  g.fillCircle(top.x + 2, top.y - 24, 13);
  g.fillStyle(leaf, 1);
  g.fillCircle(top.x - 2, top.y - 28, 13);
  g.fillStyle(shade(leaf, 1.12), 1);
  g.fillCircle(top.x - 4, top.y - 31, 7);
}

/** A dark green pine. */
export function drawPine(g: G, cx: number, cy: number) {
  box(g, cx, cy, 0.16, 0.16, 10, 0, 0x8a5a3c);
  for (let i = 0; i < 3; i++) box(g, cx, cy, 0.7 - i * 0.18, 0.7 - i * 0.18, 10, 6 + i * 9, shade(0x4f8a5c, 1 + i * 0.1));
}
