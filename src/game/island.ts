import Phaser from 'phaser';
import { cartesianToIso, GRID_SIZE } from './iso';
import { shade } from './draw';
import type { Palette, Theme } from '../state/season';
import { TILE_H_HALF, TILE_W_HALF } from './iso';

type Pt = { x: number; y: number };

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
  const C = GRID_SIZE / 2;
  const n = 4.4, half = GRID_SIZE * 0.562;
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

const GROUND: Record<Theme, string> = { spring: 'env_ground_spring', summer: 'env_ground_summer', autumn: 'env_ground_autumn', winter: 'env_ground_winter', holidays: 'env_ground_winter' };

/** Paints a mirrored painted texture across the island's diamond grid, projected into isometric space. */
function paintIso(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, ox: number, oy: number, span: number, area: number) {
  const n = Math.ceil(area / span), spanH = span * (img.height / img.width);
  const nj = Math.ceil(area / spanH);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < nj; j++) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.transform(TILE_W_HALF, TILE_H_HALF, -TILE_W_HALF, TILE_H_HALF, 0, 0); // tile units to screen
      ctx.translate(i * span, j * spanH);
      if (i % 2) { ctx.translate(span, 0); ctx.scale(-1, 1); }
      if (j % 2) { ctx.translate(0, spanH); ctx.scale(1, -1); }
      ctx.drawImage(img, 0, 0, span, spanH);
      ctx.restore();
    }
}

/**
 * The painted look of the island: your seasonal ground art over bare dirt that greens up as the two of you grow,
 * and painted sand around the rim, softly feathered into the shore. Returns null when the art is not loaded.
 */
export function paintLand(scene: Phaser.Scene, theme: Theme, greenness: number, bucket: number): Phaser.GameObjects.Image | null {
  const tex = (k: string) => (scene.textures.exists(k) ? (scene.textures.get(k).getSourceImage() as HTMLImageElement) : null);
  const grass = tex(GROUND[theme]), dirt = tex('env_ground_dirt'), sand = tex('env_sand');
  if (!grass || !dirt || !sand) return null;
  const out = toScreen(islandOutline());
  const minx = Math.min(...out.map((p) => p.x)) - 10, maxx = Math.max(...out.map((p) => p.x)) + 10;
  const miny = Math.min(...out.map((p) => p.y)) - 10, maxy = Math.max(...out.map((p) => p.y)) + 24;
  const W = Math.ceil(maxx - minx), H = Math.ceil(maxy - miny);
  const key = `isl_land_${theme}_${GRID_SIZE}_${bucket}`;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvasTex = scene.textures.createCanvas(key, W, H);
  if (!canvasTex) return null;
  const ctx = canvasTex.getContext();
  const poly = (c: CanvasRenderingContext2D, scale: number) => {
    const pts = toScreen(islandOutline(scale));
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.x - minx, p.y - miny) : c.moveTo(p.x - minx, p.y - miny)));
    c.closePath();
  };
  const layer = (fn: (c: CanvasRenderingContext2D) => void, featherFrom: number, featherTo: number, alpha: number) => {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const c = cv.getContext('2d')!;
    fn(c);
    // feather the edge with nested polygons instead of a blur, which not every browser supports on canvas
    const mask = document.createElement('canvas');
    mask.width = W;
    mask.height = H;
    const m = mask.getContext('2d')!;
    const steps = 9;
    for (let k = 0; k < steps; k++) {
      m.fillStyle = `rgba(255,255,255,${k === 0 ? 0.12 : 0.26})`;
      poly(m, featherFrom + ((featherTo - featherFrom) * k) / (steps - 1));
      m.fill();
    }
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(mask, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(cv, 0, 0);
    ctx.globalAlpha = 1;
  };
  // sand rim
  layer((c) => {
    c.save();
    poly(c, 0.985);
    c.clip();
    paintIso(c, sand, -minx, -miny, 6, GRID_SIZE);
    c.restore();
  }, 0.985, 0.95, 0.8);
  // the lawn: dirt first, then the seasonal ground fading in as you grow
  layer((c) => {
    c.save();
    poly(c, 0.9);
    c.clip();
    paintIso(c, dirt, -minx, -miny, 10, GRID_SIZE);
    c.globalAlpha = Math.max(0, Math.min(1, greenness));
    paintIso(c, grass, -minx, -miny, 10, GRID_SIZE);
    c.restore();
  }, 0.9, 0.845, 1);
  canvasTex.refresh();
  return scene.add.image(minx, miny, key).setOrigin(0, 0).setDepth(-49.6);
}

/** Soft painted island: layered grass and sand with no tile seams. A faint grid only shows while decorating. */
export function drawIsland(scene: Phaser.Scene, pal: Palette, art?: { theme: Theme; greenness: number; bucket: number }): IslandLayers {
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
  const G = GRID_SIZE, k = G / 10;
  const painted = art ? paintLand(scene, art.theme, art.greenness, art.bucket) : null;
  if (painted) objects.push(painted);
  // gentle lawn variation: big soft patches rather than tiles (only when the painted art is missing)
  for (let i = 0; !painted && i < 16 * k * k; i++) {
    const px = 1.5 + hash(i, 3) * (G - 3), py = 1.5 + hash(5, i) * (G - 3);
    const r = 1.2 + hash(i, i) * 1.8;
    const ring: Pt[] = [];
    for (let k = 0; k < 24; k++) ring.push({ x: px + Math.cos((k / 24) * Math.PI * 2) * r, y: py + Math.sin((k / 24) * Math.PI * 2) * r * 0.9 });
    fillPoly(land, toScreen(ring), i % 2 ? pal.grassB : mix(pal.grassA, 0xffffff, 0.25), 0.22);
  }
  // tiny flowers and tufts
  for (let i = 0; !painted && i < 46 * k * k; i++) {
    const x = 1.2 + hash(i, 9) * (G - 2.4), y = 1.2 + hash(9, i) * (G - 2.4);
    const dx = x - G / 2, dy = y - G / 2;
    if (Math.abs(dx) ** 4.4 + Math.abs(dy) ** 4.4 > (4.6 * k) ** 4.4) continue;
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
