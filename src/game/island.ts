import Phaser from 'phaser';
import { cartesianToIso, GRID_SIZE } from './iso';
import { shade } from './draw';
import type { Palette } from '../state/season';

type Pt = { x: number; y: number };
const C = GRID_SIZE / 2;

const hash = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const mix = (a: number, b: number, t: number) => {
  const f = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (f(16) << 16) | (f(8) << 8) | f(0);
};

/** The island's edge in tile coordinates: a soft squircle with a little natural wobble. */
export function islandOutline(scale = 1): Pt[] {
  const pts: Pt[] = [];
  const n = 4.4, half = 5.62;
  for (let i = 0; i < 180; i++) {
    const t = (i / 180) * Math.PI * 2;
    const wob = 1 + 0.028 * Math.sin(3 * t + 1.2) + 0.02 * Math.sin(5 * t + 0.4) + 0.012 * Math.sin(9 * t);
    const cx = Math.cos(t), sy = Math.sin(t);
    const x = Math.sign(cx) * Math.abs(cx) ** (2 / n) * half * wob;
    const y = Math.sign(sy) * Math.abs(sy) ** (2 / n) * half * wob;
    pts.push({ x: C + x * scale, y: C + y * scale });
  }
  return pts;
}

const toScreen = (pts: Pt[], dy = 0): Pt[] => pts.map((p) => {
  const s = cartesianToIso(p.x, p.y);
  return { x: s.x, y: s.y + dy };
});

function fillPoly(g: Phaser.GameObjects.Graphics, pts: Pt[], color: number, alpha = 1) {
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

export interface IslandLayers {
  objects: Phaser.GameObjects.GameObject[];
  grid: Phaser.GameObjects.Graphics;
}

/** Soft painted island: layered grass and sand with no tile seams. A faint grid only shows while decorating. */
export function drawIsland(scene: Phaser.Scene, pal: Palette): IslandLayers {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const base = scene.add.graphics().setDepth(-60);
  objects.push(base);
  // soft shadow under the island, then the sandy cliff the island stands on
  const out = islandOutline();
  fillPoly(base, toScreen(out, 26), 0x2a4a6a, 0.1);
  fillPoly(base, toScreen(out, 16), shade(pal.sandEdge, 0.82));
  fillPoly(base, toScreen(out, 9), pal.sandEdge);

  const land = scene.add.graphics().setDepth(-50);
  objects.push(land);
  fillPoly(land, toScreen(out), pal.sand);
  // concentric bands: wet sand rim, dry sand, a blend, then the lawn
  fillPoly(land, toScreen(islandOutline(0.965)), mix(pal.sand, 0xffffff, 0.25));
  fillPoly(land, toScreen(islandOutline(0.9)), mix(pal.sand, pal.grassA, 0.55));
  fillPoly(land, toScreen(islandOutline(0.86)), pal.grassA);
  // gentle lawn variation: big soft patches rather than tiles
  for (let i = 0; i < 16; i++) {
    const px = 1.5 + hash(i, 3) * 7, py = 1.5 + hash(5, i) * 7;
    const r = 1.2 + hash(i, i) * 1.8;
    const ring: Pt[] = [];
    for (let k = 0; k < 24; k++) ring.push({ x: px + Math.cos((k / 24) * Math.PI * 2) * r, y: py + Math.sin((k / 24) * Math.PI * 2) * r * 0.9 });
    fillPoly(land, toScreen(ring), i % 2 ? pal.grassB : mix(pal.grassA, 0xffffff, 0.25), 0.22);
  }
  // tiny flowers and tufts
  for (let i = 0; i < 46; i++) {
    const x = 1.2 + hash(i, 9) * 7.6, y = 1.2 + hash(9, i) * 7.6;
    const dx = x - C, dy = y - C;
    if (Math.abs(dx) ** 4.4 + Math.abs(dy) ** 4.4 > 4.6 ** 4.4) continue;
    const s = cartesianToIso(x, y);
    land.fillStyle(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0xffc4d6 : 0xfff0a8, 0.9);
    land.fillCircle(s.x, s.y, 1.6);
    land.fillStyle(shade(pal.grassB, 0.8), 0.7);
    land.fillTriangle(s.x + 4, s.y + 2, s.x + 6, s.y - 3, s.x + 8, s.y + 2);
  }
  // sea foam hugging the shore
  const foam = scene.add.graphics().setDepth(-49);
  objects.push(foam);
  const shore = toScreen(out, 9);
  foam.lineStyle(3, 0xffffff, 0.8);
  foam.beginPath();
  foam.moveTo(shore[0].x, shore[0].y);
  for (let i = 1; i < shore.length; i++) foam.lineTo(shore[i].x, shore[i].y);
  foam.closePath();
  foam.strokePath();

  // the grid, drawn only while decorating
  const grid = scene.add.graphics().setDepth(-48);
  grid.lineStyle(1.5, 0xffffff, 0.45);
  for (let i = 0; i <= GRID_SIZE; i++) {
    const a = cartesianToIso(i, 0), b = cartesianToIso(i, GRID_SIZE), c = cartesianToIso(0, i), d = cartesianToIso(GRID_SIZE, i);
    grid.beginPath();
    grid.moveTo(a.x, a.y);
    grid.lineTo(b.x, b.y);
    grid.strokePath();
    grid.beginPath();
    grid.moveTo(c.x, c.y);
    grid.lineTo(d.x, d.y);
    grid.strokePath();
  }
  grid.setVisible(false);
  objects.push(grid);
  return { objects, grid };
}
