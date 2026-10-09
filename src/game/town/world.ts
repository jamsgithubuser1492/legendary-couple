import Phaser from 'phaser';
import { tileCenter } from '../iso';
import { shade } from '../draw';
import { LOTS, TOWN, regionOf, type RegionId } from '../../state/town';
import { PALETTES, type Theme } from '../../state/season';
import { drawPier, fbm, feather, fillPoly, hash2, mixColor, proj, roundedRect, splinePts, strokePoly, type Pt } from './nature';
import { SPRITES } from '../spriteList';

type Obj = Phaser.GameObjects.GameObject;
const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));

/** The painted world: tiles from EXT.x0..x1 by EXT.y0..y1. The playable town sits at 0..31 in the middle. */
export const EXT = { x0: -9, x1: 41, y0: -9, y1: 41 };
const R0 = -18, R1 = 50; // working range for distance maps
const SIZE = R1 - R0 + 1;

export const hash = hash2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---------- the coastline ----------
const softplus = (z: number) => Math.log(1 + Math.exp(z));
// a smooth wobbling shoreline: no hard clamps, so the curve never kinks or spikes
const baseCoastX = (y: number) => {
  const v = -4.2 + 1.9 * Math.sin(y * 0.27 + 0.8) + 0.9 * Math.sin(y * 0.55 + 2.2) - 1.3 * Math.exp(-(((y - 24) / 4) ** 2));
  return -1.3 - softplus(-1.3 - v);
};
// the lighthouse headland juts out as a rounded bulge at the top of the west coast
const bulge = (y: number) => (Math.abs(y + 3) < 5.6 ? -3 - Math.sqrt(5.6 * 5.6 - (y + 3) ** 2) : 99);
export const coastX = (y: number) => Math.min(baseCoastX(y), bulge(y));
const coastY = (x: number) => Math.max(TOWN + 0.5, 35.6 + 2.2 * Math.sin(x * 0.31 + 1.3) + 1.5 * Math.sin(x * 0.77));

export function isLand(x: number, y: number): boolean {
  if (x >= 0 && y >= 0 && x < TOWN && y < TOWN) return true;
  return x >= coastX(y) && y <= coastY(x);
}

let landDist: Float32Array | null = null; // for land tiles: tiles to the nearest water
let waterDist: Float32Array | null = null; // for water tiles: tiles to the nearest land
const idx = (x: number, y: number) => (y - R0) * SIZE + (x - R0);

function buildDistances() {
  if (landDist && waterDist) return;
  landDist = new Float32Array(SIZE * SIZE).fill(99);
  waterDist = new Float32Array(SIZE * SIZE).fill(99);
  for (const [map, wantLand] of [[landDist, false], [waterDist, true]] as const) {
    const q: [number, number][] = [];
    for (let y = R0; y <= R1; y++)
      for (let x = R0; x <= R1; x++) {
        const land = isLand(x, y);
        if (land !== wantLand) continue; // this tile is the "other" kind
        // seed: tiles next to a tile of the target kind
        const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isLand(x + dx, y + dy) === wantLand);
        if (next) {
          map[idx(x, y)] = 1;
          q.push([x, y]);
        }
      }
    while (q.length) {
      const [x, y] = q.shift()!;
      const d = map[idx(x, y)];
      if (d >= 9) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < R0 || ny < R0 || nx > R1 || ny > R1 || isLand(nx, ny) === wantLand) continue;
        if (map[idx(nx, ny)] > d + 1) {
          map[idx(nx, ny)] = d + 1;
          q.push([nx, ny]);
        }
      }
    }
  }
}
const dLand = (x: number, y: number) => (x < R0 || y < R0 || x > R1 || y > R1 ? 99 : landDist![idx(x, y)]);

/** Region for any tile in the painted world; the edges borrow the nearest region. */
export const regionAt = (x: number, y: number): RegionId => regionOf(clamp(x, 0, TOWN - 1), clamp(y, 0, TOWN - 1));

// ---------- colours ----------
const SKY: Record<Theme, [number, string][]> = {
  spring: [[0, '#f7c6dc'], [0.22, '#fde0d8'], [0.38, '#fff0dc'], [0.4, '#bfe8ec'], [0.7, '#78c0dc'], [1, '#4a98c8']],
  summer: [[0, '#8fd0f0'], [0.25, '#c0e8f8'], [0.38, '#fff4d0'], [0.4, '#a8e8f0'], [0.7, '#5cc0e0'], [1, '#3c90c8']],
  autumn: [[0, '#f0a4a0'], [0.2, '#f8c0a0'], [0.36, '#ffe0b0'], [0.4, '#a8d8e0'], [0.7, '#6aa8cc'], [1, '#4a84b4']],
  winter: [[0, '#c8c8e8'], [0.25, '#dcdcf0'], [0.38, '#f0eef8'], [0.4, '#bcd8ec'], [0.7, '#8ab4d8'], [1, '#6890bc']],
  holidays: [[0, '#b8c0e8'], [0.25, '#d0d4f0'], [0.38, '#eceaf8'], [0.4, '#b4d0ea'], [0.7, '#84acd4'], [1, '#5c88b8']],
};
const HAZE = 0xe6ecf4;
const SHALLOW = 0xa4e4dc, DEEP = 0x4c9ccc;

// ---------- the backdrop: sky, sun, clouds and soft lighting ----------
function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h);
  if (!t) return;
  draw(t.getContext());
  t.refresh();
}

export class Backdrop {
  private sky!: Phaser.GameObjects.Image;
  private sun!: Phaser.GameObjects.Image;
  private light!: Phaser.GameObjects.Image;
  private clouds: { img: Phaser.GameObjects.Image; fx: number; fy: number; speed: number; size: number }[] = [];
  private theme: Theme = 'spring';

  constructor(private scene: Phaser.Scene) {
    for (const theme of Object.keys(SKY) as Theme[]) {
      canvasTex(scene, `sky_${theme}`, 4, 512, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 512);
        SKY[theme].forEach(([p, col]) => g.addColorStop(p, col));
        c.fillStyle = g;
        c.fillRect(0, 0, 4, 512);
      });
    }
    canvasTex(scene, 'sun_glow', 256, 256, (c) => {
      const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,250,225,1)');
      g.addColorStop(0.18, 'rgba(255,236,190,0.95)');
      g.addColorStop(0.5, 'rgba(255,214,170,0.35)');
      g.addColorStop(1, 'rgba(255,200,160,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 256);
    });
    canvasTex(scene, 'cloud', 256, 96, (c) => {
      c.filter = 'blur(6px)';
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [x, y, r] of [[70, 56, 30], [110, 44, 38], [155, 54, 34], [190, 60, 24], [100, 64, 30]]) {
        c.beginPath();
        c.ellipse(x, y, r * 1.5, r * 0.8, 0, 0, Math.PI * 2);
        c.fill();
      }
    });
    canvasTex(scene, 'town_light', 512, 512, (c) => {
      const v = c.createRadialGradient(256, 256, 120, 256, 256, 380);
      v.addColorStop(0, 'rgba(60,40,80,0)');
      v.addColorStop(1, 'rgba(60,40,80,0.28)');
      c.fillStyle = v;
      c.fillRect(0, 0, 512, 512);
      const w = c.createLinearGradient(0, 0, 512, 512); // warm light from the sunset side
      w.addColorStop(0, 'rgba(255,190,140,0.16)');
      w.addColorStop(0.6, 'rgba(255,190,140,0)');
      c.fillStyle = w;
      c.fillRect(0, 0, 512, 512);
    });
    this.sky = scene.add.image(0, 0, 'sky_spring').setOrigin(0, 0).setDepth(-1000);
    this.sun = scene.add.image(0, 0, 'sun_glow').setDepth(-999);
    this.light = scene.add.image(0, 0, 'town_light').setOrigin(0, 0).setDepth(9500);
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        img: scene.add.image(0, 0, 'cloud').setDepth(-998).setAlpha(0.7),
        fx: Math.random(), fy: 0.04 + Math.random() * 0.26, speed: 0.004 + Math.random() * 0.006, size: 0.8 + Math.random() * 0.9,
      });
    }
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.sky.setTexture(`sky_${theme}`);
    const winter = theme === 'winter' || theme === 'holidays';
    this.sun.setTint(winter ? 0xdde4ff : 0xffffff).setAlpha(winter ? 0.7 : 1);
  }

  /** Keeps everything glued to the screen even as the camera pans and zooms. */
  update(_t?: number, delta = 16) {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const inv = 1 / cam.zoom;
    this.sky.setPosition(v.x, v.y).setDisplaySize(v.width, v.height);
    this.light.setPosition(v.x, v.y).setDisplaySize(v.width, v.height);
    const sunSize = Math.max(v.height * 0.62, 220 * inv);
    this.sun.setPosition(v.x + v.width * 0.1, v.y + v.height * 0.36).setDisplaySize(sunSize, sunSize);
    for (const c of this.clouds) {
      c.fx = (c.fx + (c.speed * delta) / 1000) % 1.2;
      c.img.setPosition(v.x + (c.fx - 0.1) * v.width, v.y + c.fy * v.height).setScale(inv * c.size * 1.3);
    }
    void this.theme;
  }
}

// ---------- the land and sea ----------
export interface TerrainResult {
  objects: Obj[];
  /** Call every frame with the scene time (ms). Animates ripples and sparkles on the water. */
  tick: (time: number) => void;
}

/** Where each locked region's mist sits, in tile coordinates (extended past the edges of the map). */
export const REGION_RECTS: Partial<Record<RegionId, { x0: number; y0: number; x1: number; y1: number }>> = {
  country: { x0: -2, y0: -11, x1: 17.6, y1: 13.6 },
  mountain: { x0: 15.8, y0: -13, x1: 46, y1: 11.8 },
  campus: { x0: 17.8, y0: 11.8, x1: 46, y1: 21.8 },
  downtown: { x0: 17.8, y0: 21.8, x1: 46, y1: 36.5 },
};

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });

export function drawTerrain(scene: Phaser.Scene, theme: Theme): TerrainResult {
  buildDistances();
  const pal = PALETTES[theme];
  const objects: Obj[] = [];
  const winter = theme === 'winter' || theme === 'holidays';
  const tint = (c: number, k = 0.5) => (winter ? mixColor(c, 0xf4f8fc, k) : c);
  const gfx = (depth: number) => {
    const g = scene.add.graphics().setDepth(depth);
    objects.push(g);
    return g;
  };

  // ----- the coastline, as one smooth curve -----
  const west: Pt[] = [];
  for (let y = -12; y <= 35; y += 1.1) west.push({ x: coastX(y), y });
  const south: Pt[] = [];
  for (let x = -2.5; x <= EXT.x1 + 3; x += 1.3) south.push({ x, y: coastY(x) });
  const coast = splinePts([...west, ...south], 380);
  const rawNormals: Pt[] = coast.map((_p, i) => {
    const a = coast[Math.max(0, i - 9)], b = coast[Math.min(coast.length - 1, i + 9)];
    const t = sub(b, a);
    const len = Math.hypot(t.x, t.y) || 1;
    return { x: -t.y / len, y: t.x / len };
  });
  // one orientation for the whole curve: pick the side that points at land for most of it, so tight turns never flip
  let votes = 0;
  coast.forEach((p, i) => {
    if (i % 6) return;
    votes += isLand(p.x + rawNormals[i].x * 1.2, p.y + rawNormals[i].y * 1.2) ? 1 : -1;
  });
  const orient = votes >= 0 ? 1 : -1;
  const normals: Pt[] = rawNormals.map((n) => ({ x: n.x * orient, y: n.y * orient }));
  const offset = (d: number): Pt[] => coast.map((p, i) => ({ x: p.x + normals[i].x * d, y: p.y + normals[i].y * d }));
  const band = (d: number): Pt[] => [...coast.map(proj), ...offset(d).map(proj).reverse()];

  const screenCoast = coast.map(proj);

  // ----- the sea: one smooth gradient painted from the distance to the shore -----
  const waterKey = `town_water_${theme}`;
  const K = 0.5, RES = 5, SPAN = R1 - R0 + 1;
  if (!scene.textures.exists(waterKey)) {
    const pts = coast.filter((_, i) => i % 4 === 0);
    const src = document.createElement('canvas');
    src.width = src.height = SPAN * RES;
    const sc = src.getContext('2d')!;
    const img = sc.createImageData(src.width, src.height);
    const stops: [number, number, number][] = [[0, SHALLOW, 0.96], [2.2, 0x78d2dc, 0.94], [5, 0x62b8de, 0.88], [10, DEEP, 0.78]];
    for (let py = 0; py < src.height; py++)
      for (let px = 0; px < src.width; px++) {
        const x = R0 + (px + 0.5) / RES, y = R0 + (py + 0.5) / RES;
        let d = 99;
        for (const c of pts) {
          const dd = Math.hypot(c.x - x, c.y - y);
          if (dd < d) d = dd;
        }
        let k = 1;
        while (k < stops.length - 1 && d > stops[k][0]) k++;
        const [d0, c0, a0] = stops[k - 1], [d1, c1, a1] = stops[k];
        const t = clamp((d - d0) / (d1 - d0), 0, 1);
        let col = mixColor(c0, c1, t);
        if (winter) col = mixColor(col, 0xcfe0f0, 0.3);
        const i = (py * src.width + px) * 4;
        img.data[i] = (col >> 16) & 255;
        img.data[i + 1] = (col >> 8) & 255;
        img.data[i + 2] = col & 255;
        const edge = Math.min(x - R0, R1 - x, y - R0, R1 - y); // melt into the horizon at the outer edge
        const fade = clamp(edge / 9, 0, 1);
        img.data[i + 3] = Math.round((a0 + (a1 - a0) * t) * 255 * fade * fade * (3 - 2 * fade));
      }
    sc.putImageData(img, 0, 0);
    const W = Math.ceil(SPAN * 64 * K), H = Math.ceil(SPAN * 32 * K);
    const tex = scene.textures.createCanvas(waterKey, W, H);
    if (tex) {
      const c = tex.getContext();
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      // tile space (x, y) -> isometric pixels, so the gradient follows the world's perspective
      c.setTransform(32 * K, 16 * K, -32 * K, 16 * K, SPAN * 32 * K, -R0 * 32 * K);
      c.drawImage(src, R0, R0, SPAN, SPAN);
      tex.refresh();
    }
  }
  // canvas pixel (0, 0) sits at world (-SPAN * 32, R0 * 32)
  const waterImg = scene.add.image(-SPAN * 32, R0 * 32, waterKey).setOrigin(0, 0).setScale(1 / K).setDepth(-70);
  objects.push(waterImg);

  // ----- the land -----
  const landPoly: Pt[] = [{ x: EXT.x1 + 3, y: -12 }, ...coast, { x: EXT.x1 + 3, y: coastY(EXT.x1 + 3) }];
  // sandy cliff where the land meets the sea on the viewer's side
  const slab = gfx(-62);
  for (let i = 0; i < coast.length - 1; i++) {
    const out = { x: -normals[i].x, y: -normals[i].y };
    if (out.x + out.y < 0.3) continue;
    const a = proj(coast[i]), b = proj(coast[i + 1]);
    slab.fillStyle(shade(pal.sandEdge, out.x > out.y ? 0.78 : 0.9), 1);
    slab.beginPath();
    slab.moveTo(a.x, a.y);
    slab.lineTo(b.x, b.y);
    slab.lineTo(b.x, b.y + 15);
    slab.lineTo(a.x, a.y + 15);
    slab.closePath();
    slab.fillPath();
  }
  const land = gfx(-60);
  fillPoly(land, landPoly.map(proj), tint(pal.grassA, 0.55));

  // wide soft colour areas for each part of the world
  const zones = gfx(-58);
  feather(zones, -2.5, -12, 17.8, 13.8, 3, tint(theme === 'autumn' ? 0xcbc476 : 0xb9d87e, 0.4), 0.95, 2.4); // farmland
  feather(zones, 15.5, -14, 46, 12, 4, tint(theme === 'autumn' ? 0xa8977a : 0xa6a584, 0.45), 0.9, 2.6); // mountain slopes
  feather(zones, 17.8, 11.8, 46, 22, 3, tint(0xd3ecc0, 0.5), 0.95, 2.2); // campus lawns
  feather(zones, 17.8, 21.8, 46, 46, 2, tint(0xd5d3cf, 0.5), 0.95, 1.6); // downtown paving
  // gentle shading so the land is not flat
  const shadeG = gfx(-57);
  for (let i = 0; i < 26; i++) {
    const cx = -2 + hash2(i, 5) * 42, cy = -8 + hash2(7, i) * 40;
    if (!isLand(cx, cy)) continue;
    const r = 2 + hash2(i, i) * 3.5;
    const ring: Pt[] = [];
    for (let k = 0; k < 20; k++) ring.push({ x: cx + Math.cos((k / 20) * Math.PI * 2) * r, y: cy + Math.sin((k / 20) * Math.PI * 2) * r * 0.9 });
    fillPoly(shadeG, ring.map(proj), i % 2 ? 0xffffff : 0x4a6a40, i % 2 ? 0.09 : 0.06);
  }

  // ----- beaches and the headland -----
  const beach = gfx(-56);
  fillPoly(beach, band(3.6), mixColor(pal.sand, pal.grassA, 0.6), 0.5);
  fillPoly(beach, band(2.4), tint(pal.sand, 0.4));
  fillPoly(beach, band(0.9), tint(shade(pal.sand, 0.9), 0.3));
  // the lighthouse headland, a rounded rocky outcrop
  const rock: Pt[] = [];
  for (let k = 0; k < 30; k++) {
    const a = (k / 30) * Math.PI * 2;
    const r = 4.1 + Math.sin(a * 3 + 1) * 0.35 + Math.sin(a * 5) * 0.2;
    rock.push({ x: -3 + Math.cos(a) * r, y: -3 + Math.sin(a) * r });
  }
  const cliff = gfx(-55);
  fillPoly(cliff, rock.map((p) => ({ ...proj(p), y: proj(p).y + 13 })), 0x7e746c);
  fillPoly(cliff, rock.map(proj), tint(0xa9a096, 0.4));
  fillPoly(cliff, rock.map((p) => proj({ x: -3 + (p.x + 3) * 0.78, y: -3 + (p.y + 3) * 0.78 })), tint(0xb8b0a4, 0.4));
  fillPoly(cliff, rock.map((p) => proj({ x: -3.4 + (p.x + 3) * 0.5, y: -3.4 + (p.y + 3) * 0.5 })), tint(0x9bb084, 0.4), 0.85);

  // ----- farm fields: patches of crops with rows -----
  const fields = gfx(-54);
  const crops = [0xbcd982, 0xe9d37c, 0xc99d6b, 0xa8cf7c];
  const patches: [number, number, number, number][] = [
    [8, 0.5, 3, 2.6], [11.4, 0.5, 3.2, 3], [8, 3.8, 3, 2.8], [12, 4.2, 3, 2.4], [0.4, 7.2, 3.6, 2.6], [4.5, 7.4, 3, 3],
    [8, 7.2, 3, 2.2], [11.2, 7.2, 4, 3], [1, 10.8, 4, 2.4], [6, 10.6, 4, 2.6], [11, 10.8, 4.4, 2.4],
  ];
  patches.forEach(([x, y, w, d], i) => {
    const color = tint(theme === 'autumn' ? mixColor(crops[i % 4], 0xe0a860, 0.3) : crops[i % 4], 0.35);
    fillPoly(fields, roundedRect(x, y, x + w, y + d, 0.5, 5).map(proj), shade(color, 0.9));
    fillPoly(fields, roundedRect(x + 0.08, y + 0.08, x + w - 0.08, y + d - 0.08, 0.45, 5).map(proj), color);
    fields.lineStyle(1.2, shade(color, 0.8), 0.7);
    for (let t = 0.3; t < d - 0.2; t += 0.26) {
      const a = proj({ x: x + 0.3, y: y + t }), b = proj({ x: x + w - 0.3, y: y + t });
      fields.beginPath();
      fields.moveTo(a.x, a.y);
      fields.lineTo(b.x, b.y);
      fields.strokePath();
    }
  });

  // ----- roads: smooth ribbons with soft edges -----
  const roads = gfx(-52);
  const road = (pts: Pt[], width: number, main = false) => {
    const sp = splinePts(pts, Math.max(24, pts.length * 14)).map(proj);
    strokePoly(roads, sp, width + 6, tint(0xaaa49e, 0.2), 0.8);
    strokePoly(roads, sp, width, tint(0xd8d3cd, 0.2), 1);
    if (main) {
      roads.lineStyle(1.4, 0xffffff, 0.55);
      for (let i = 0; i + 1 < sp.length; i += 2) {
        roads.beginPath();
        roads.moveTo(sp[i].x, sp[i].y);
        roads.lineTo(sp[i + 1].x, sp[i + 1].y);
        roads.strokePath();
      }
    }
  };
  road([{ x: 3.4, y: 13 }, { x: 4.6, y: 18 }, { x: 4.2, y: 23 }, { x: 5.4, y: 27 }], 15, true); // seaside promenade
  for (const y of [18, 24]) road([{ x: 3.5, y }, { x: 9, y: y + 0.2 }, { x: 15, y: y - 0.2 }, { x: 18, y }], 12);
  for (const x of [6, 12]) road([{ x, y: 14 }, { x: x + 0.2, y: 20 }, { x, y: 27 }], 12);
  road([{ x: 18, y: 17.5 }, { x: 24, y: 17.2 }, { x: 31, y: 17.8 }], 12, true); // campus avenue
  for (const x of [21, 24, 27, 30]) road([{ x, y: 22 }, { x: x + 0.1, y: 27 }, { x, y: 33 }], 11);
  for (const y of [24, 27, 30]) road([{ x: 18, y }, { x: 25, y: y + 0.1 }, { x: 33, y }], 11);
  road([{ x: 8, y: -0.5 }, { x: 8.6, y: 7 }, { x: 9, y: 14 }], 10); // country lane

  // ----- waves: crests roll in from the open sea, the surf breathes, and sparkles twinkle -----
  const foam = gfx(-49);
  const anim = gfx(-48);
  const crests = Array.from({ length: 110 }, (_, i) => ({
    k0: Math.floor(hash2(i, 1) * (coast.length - 40)),
    len: 7 + Math.floor(hash2(i, 2) * 9),
    speed: 0.6 + hash2(i, 3) * 0.5,
    ph: hash2(i, 4),
  }));
  const glintSpots = Array.from({ length: 80 }, (_, i) => {
    const k = Math.floor(hash2(i, 4) * coast.length);
    const d = 1.5 + hash2(i, 8) * 10;
    return { p: proj({ x: coast[k].x - normals[k].x * d, y: coast[k].y - normals[k].y * d }), w: 8 + hash2(i, 2) * 9, ph: hash2(i, 6) * 6.28 };
  });
  const seaward = (j: number, d: number): Pt => ({ x: coast[j].x - normals[j].x * d, y: coast[j].y - normals[j].y * d });
  // breaking waves: your wave sprites roll toward the shore, curl through their frames, then dissolve
  const SETS: string[][] = [['wave_s0', 'wave_s1', 'wave_s2', 'wave_s3'], ['wave_m0', 'wave_m1', 'wave_m2', 'wave_m2'], ['wave_l0', 'wave_l0', 'wave_l3', 'wave_l3']];
  const breakers = scene.textures.exists('wave_s0')
    ? Array.from({ length: 44 }, (_, i) => {
        const k = 12 + Math.floor(hash2(i, 31) * (coast.length - 24));
        const r = hash2(i, 32);
        const set = SETS[r < 0.62 ? 0 : r < 0.9 ? 1 : 2];
        const img = scene.add.image(0, 0, set[0]).setOrigin(0.5, 0.78).setDepth(-47).setAlpha(0);
        objects.push(img);
        const toLand = proj(normals[k]).x - proj({ x: 0, y: 0 }).x; // which way the swell travels on screen
        return { k, set, img, off: hash2(i, 33), speed: 0.8 + hash2(i, 34) * 0.5, flip: toLand < 0, shown: '' };
      })
    : [];
  const rollBreakers = (time: number) => {
    for (const b of breakers) {
      const ph = (time / (4600 / b.speed) + b.off) % 1;
      if (ph > 0.82) {
        b.img.setAlpha(0);
        continue;
      }
      const u = ph / 0.82; // 0 far out, 1 at the shore
      const frame = b.set[Math.min(3, Math.floor(u * 4))];
      if (frame !== b.shown) {
        b.shown = frame;
        b.img.setTexture(frame);
      }
      const p = proj(seaward(b.k, 3.4 - u * 2.5));
      const grow = 0.34 + u * 0.22;
      b.img.setPosition(p.x, p.y + Math.sin(time / 500 + b.off * 9) * 1.2);
      b.img.setScale(b.flip ? -grow : grow, grow);
      b.img.setAlpha(Math.sin(Math.PI * u) * 0.92);
    }
  };
  let lastTick = -999;
  const tick = (time: number) => {
    rollBreakers(time);
    if (time - lastTick < 60) return;
    lastTick = time;
    foam.clear();
    anim.clear();
    // the shoreline: a bright foam edge that pulses, and a swash that creeps up the sand and drains back
    const pulse = 0.5 + 0.5 * Math.sin(time / 1300);
    strokePoly(foam, screenCoast, 3.2 + pulse * 2.2, 0xffffff, 0.62 + pulse * 0.3);
    const swash = coast.map((p, j) => {
      const d = -0.15 - (0.5 + 0.5 * Math.sin(time / 1700 + j * 0.05)) * 0.55;
      return proj({ x: p.x - normals[j].x * d, y: p.y - normals[j].y * d });
    });
    strokePoly(foam, swash, 2, 0xffffff, 0.34);
    // rolling crests: each travels from deep water in to the shore, growing brighter, then fades as it breaks
    for (const c of crests) {
      const ph = (time / (9000 / c.speed) + c.ph) % 1;
      const d = 9.5 - ph * 8.8;
      const fade = Math.sin(Math.PI * Math.min(1, ph * 1.05)) * (0.3 + 0.55 * ph);
      let prev: Pt | null = null;
      for (let j = c.k0; j < c.k0 + c.len; j++) {
        const u = (j - c.k0) / c.len;
        const here = proj(seaward(j, d + Math.sin(u * Math.PI) * 0.3)); // each crest bows toward the shore like a real swell
        if (prev) {
          const taper = Math.sin(Math.PI * u);
          anim.lineStyle(3.4 + ph * 2.2, 0xffffff, fade * taper * 0.22); // soft glow under the crest
          anim.beginPath();
          anim.moveTo(prev.x, prev.y);
          anim.lineTo(here.x, here.y);
          anim.strokePath();
          anim.lineStyle(1.4 + ph * 1.2, 0xffffff, fade * taper * 0.85);
          anim.beginPath();
          anim.moveTo(prev.x, prev.y);
          anim.lineTo(here.x, here.y);
          anim.strokePath();
        }
        prev = here;
      }
    }
    // twinkling sparkles
    for (const g of glintSpots) {
      const a = Math.max(0, Math.sin(time / 650 + g.ph));
      if (a < 0.25) continue;
      anim.fillStyle(0xffffff, a * 0.75);
      anim.fillEllipse(g.p.x, g.p.y, g.w * (0.6 + a * 0.4), 2.6);
      if (a > 0.85) {
        anim.fillStyle(0xfff6d8, 0.8);
        anim.fillEllipse(g.p.x, g.p.y, 3.2, 3.2);
      }
    }
  };
  tick(0);

  // ----- piers out into the sea -----
  const piers = gfx(-46);
  drawPier(piers, 1.5, 21.6, -9.5, 21.6, 1.7);
  drawPier(piers, 21.6, 31, 21.6, 41, 1.7);

  // ----- mountains: your painted peaks, in a rolling chain at the back of the map -----
  const peaks: [string, number, number, number, boolean][] = [
    ['mountain_b', 19, -6, 0.95, false], ['mountain_a', 25, -9, 1.12, false], ['mountain_b', 33, -9, 1.1, true], ['mountain_a', 40, -3, 1.1, true],
    ['mountain_b', 38, 6, 0.95, false], ['mountain_a', 31, -1, 0.82, true], ['mountain_b', 27, -3, 0.78, false],
  ];
  peaks.sort((a, b) => a[1] + a[2] - (b[1] + b[2]));
  for (const [key, px, py, sc, flip] of peaks) {
    if (!scene.textures.exists(key)) continue;
    const base = proj({ x: px, y: py });
    const im = scene.add.image(base.x, base.y, key).setOrigin(0.5, 0.86).setFlipX(flip).setDepth(px + py + 0.2);
    im.setScale(((DW.get(key) ?? im.width) / im.width) * sc);
    const far = clamp((24 - (px + py)) / 40, 0, 0.35);
    if (far > 0.02) im.setAlpha(1 - far * 0.5);
    objects.push(im);
  }

  // ----- forests and palms: soft clumps by noise, never on buildings or roads -----
  const lotTiles = new Set<string>();
  for (const l of LOTS) for (let i = -1; i <= l.w; i++) for (let j = -1; j <= l.d; j++) lotTiles.add(`${l.x + i},${l.y + j}`);
  const laneNear = (x: number, y: number) => {
    if (x < 0 || y < 0) return false;
    const m = (v: number, k: number) => Math.abs(v - k) < 0.8;
    return [6, 12].some((k) => m(x, k) && y > 13 && y < 28) || [18, 24].some((k) => m(y, k) && x > 3 && x < 19) || [21, 24, 27, 30].some((k) => m(x, k) && y > 21) || [24, 27, 30].some((k) => m(y, k) && x > 17) || (m(y, 17.5) && x > 17);
  };
  const treeFor = (jx: number, jy: number, mountainous: boolean): string => {
    const r = hash2(jy * 1.3, jx * 0.7);
    if (mountainous) {
      if (winter) return r < 0.4 ? 'pine_snow' : r < 0.7 ? 'pines_cluster_a' : 'pines_cluster_b';
      return r < 0.25 ? 'pine_a' : r < 0.4 ? 'pine_c' : r < 0.65 ? 'pines_cluster_a' : r < 0.85 ? 'pines_cluster_b' : 'pines_cluster_c';
    }
    if (winter) return r < 0.5 ? 'tree_snowpine' : r < 0.8 ? 'tree_pine' : 'tree_round';
    if (theme === 'autumn') return r < 0.38 ? 'tree_maple' : r < 0.7 ? 'tree_round' : 'tree_pine';
    if (theme === 'spring') return r < 0.22 ? 'tree_blossom' : r < 0.6 ? 'tree_round' : 'tree_pine';
    return r < 0.55 ? 'tree_round' : 'tree_pine';
  };
  const put = (key: string, jx: number, jy: number, scale = 1) => {
    if (!scene.textures.exists(key)) return;
    const s = proj({ x: jx, y: jy });
    const im = scene.add.image(s.x, s.y + 12, key).setOrigin(0.5, 1).setDepth(Math.floor(jx + jy) + 0.3);
    im.setScale(((DW.get(key) ?? im.width) / im.width) * scale);
    objects.push(im);
  };
  for (let x = EXT.x0; x <= EXT.x1; x += 0.85)
    for (let y = EXT.y0; y <= EXT.y1; y += 0.85) {
      const jx = x + (hash2(x * 3, y) - 0.5) * 0.8, jy = y + (hash2(x, y * 3) - 0.5) * 0.8;
      if (!isLand(jx, jy) || lotTiles.has(`${Math.floor(jx)},${Math.floor(jy)}`) || laneNear(jx, jy)) continue;
      const inCore = jx >= 0 && jy >= 0 && jx < TOWN && jy < TOWN;
      const region = regionAt(jx, jy);
      const d = Math.min(1, fbm(jx * 0.2, jy * 0.2) ** 1.6 * 2.1); // clumps, with clearings between
      const nearSea = dLand(Math.floor(jx), Math.floor(jy)) <= 3.5 && (!inCore || jx < 3 || jy > 26);
      let p = 0;
      if (nearSea) p = region === 'coast' || !inCore ? 0.05 : 0;
      else if (!inCore) p = (region === 'mountain' ? 0.9 : 0.8) * d;
      else if (region === 'mountain') p = 0.8 * d;
      else if (region === 'country') p = jx > 15 ? 0.3 * d : jy < 1 || jy > 12.4 ? 0.28 * d : 0;
      else if (region === 'campus') p = 0.1 * d;
      else if (region === 'coast') p = jx > 15 || jy < 15.5 ? 0.12 * d : 0.025;
      if (hash2(jx * 7.7, jy * 3.1) > p) continue;
      const palm = ['palm_short', 'palm_medium', 'palm_tall'][Math.floor(hash2(jx, jy) * 3)];
      const scale = 0.85 + hash2(jx * 2, jy) * 0.3;
      if (nearSea) put(palm, jx, jy, scale);
      else put(treeFor(jx, jy, region === 'mountain' || (!inCore && jy < 8 && jx > 14)), jx, jy, scale);
    }

  // ----- far edges melt into haze -----
  const haze = gfx(8000);
  for (let k = 1; k <= 9; k++) {
    fillPoly(haze, [{ x: -14, y: -14 }, { x: EXT.x1 + 8, y: -14 }, { x: EXT.x1 + 8, y: -14 + k * 1.4 }, { x: -14, y: -14 + k * 1.4 }].map(proj), HAZE, 0.09);
    fillPoly(haze, [{ x: EXT.x1 + 8 - k * 1.4, y: -14 }, { x: EXT.x1 + 8, y: -14 }, { x: EXT.x1 + 8, y: 46 }, { x: EXT.x1 + 8 - k * 1.4, y: 46 }].map(proj), HAZE, 0.09);
  }
  return { objects, tick };
}

/** Whole painted world, as a camera target. */
export const WORLD_CENTER = tileCenter(15.5, 17);
