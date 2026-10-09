import Phaser from 'phaser';
import { cartesianToIso, tileCenter } from '../iso';
import { diamond, shade } from '../draw';
import { LOTS, TOWN, regionOf, type RegionId } from '../../state/town';
import { PALETTES, type Palette, type Theme } from '../../state/season';
import { SPRITES } from '../spriteList';
import { drawPalm, drawPeak, drawPine, drawTree } from './buildings';

type Obj = Phaser.GameObjects.GameObject;

/** The painted world: tiles from EXT.x0..x1 by EXT.y0..y1. The playable town sits at 0..31 in the middle. */
export const EXT = { x0: -9, x1: 41, y0: -9, y1: 41 };
const R0 = -18, R1 = 50; // working range for distance maps
const SIZE = R1 - R0 + 1;
const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));

export const hash = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerpC = (a: number, b: number, t: number) => {
  const f = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (f(16) << 16) | (f(8) << 8) | f(0);
};

// ---------- the coastline ----------
const coastX = (y: number) => Math.min(-1.2, -3.8 + 2.4 * Math.sin(y * 0.27 + 0.8) + 1.6 * Math.sin(y * 0.71 + 2.2) - (y > 19 && y < 29 ? 1.4 : 0));
const coastY = (x: number) => Math.max(TOWN + 0.5, 35.6 + 2.2 * Math.sin(x * 0.31 + 1.3) + 1.5 * Math.sin(x * 0.77));

export function isLand(x: number, y: number): boolean {
  if (x >= 0 && y >= 0 && x < TOWN && y < TOWN) return true;
  if (Math.hypot(x + 3, y + 3) < 5.6) return true; // the lighthouse headland
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
const dWater = (x: number, y: number) => (x < R0 || y < R0 || x > R1 || y > R1 ? 99 : waterDist![idx(x, y)]);

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
const SHALLOW = 0xa4e4dc, MID = 0x6cc0dc, DEEP = 0x4c9ccc;

export function terrainColor(x: number, y: number, pal: Palette, theme: Theme): number {
  const region = regionAt(x, y);
  const inCore = x >= 0 && y >= 0 && x < TOWN && y < TOWN;
  const checker = (x + y) % 2 === 0;
  const n = 0.97 + hash(x, y) * 0.06;
  const d = dLand(x, y);
  let c: number;
  if (Math.hypot(x + 3, y + 3) < 5.6 && !inCore) c = checker ? 0xa9a39c : 0x9c9690; // headland rock
  else if ((x < 3 || y > 26 || !inCore) && d <= (inCore ? 3 : 3.5) && region === 'coast') c = d <= 1 ? 0xe2c98f : checker ? pal.sand : shade(pal.sand, 0.96);
  else if (!inCore && d <= 3.5) c = d <= 1 ? 0xe2c98f : pal.sand;
  else {
    switch (region) {
      case 'coast':
        c = inCore && (x % 6 === 0 || y % 6 === 0) ? (checker ? 0xd8d0c8 : 0xcfc7bf) : checker ? pal.grassA : pal.grassB;
        break;
      case 'country': {
        if (!inCore) {
          c = checker ? 0x9ccf7c : 0x92c672; // rolling green hills
          break;
        }
        const band = (((x >> 1) + (y >> 1)) % 3 + 3) % 3;
        const base = [0xb8d880, 0xe8d27a, 0xc89a68][band];
        c = checker ? base : shade(base, 0.94);
        break;
      }
      case 'mountain':
        c = lerpC(checker ? 0xb4aca4 : 0xa89f98, 0x7a9a68, clamp(1 - (30 - x + y) / 18, 0, 0.55));
        break;
      case 'downtown':
        c = (x - 18) % 3 === 2 || (y - 22) % 3 === 2 ? 0x9a9aa4 : checker ? 0xd2d0cc : 0xc8c6c2;
        break;
      default:
        c = checker ? 0xcfe8b8 : 0xc4e0ac;
    }
  }
  if (theme === 'winter' || theme === 'holidays') c = lerpC(c, 0xf4f8fc, region === 'coast' && d <= 2 ? 0.15 : 0.5);
  else if (theme === 'autumn' && (region === 'country' || region === 'mountain')) c = lerpC(c, 0xe0a860, 0.25);
  return shade(c, n);
}

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
}

export function drawTerrain(scene: Phaser.Scene, theme: Theme): TerrainResult {
  buildDistances();
  const pal = PALETTES[theme];
  const objects: Obj[] = [];
  const winter = theme === 'winter' || theme === 'holidays';

  // --- shallow water close to the shore, fading into the open sea ---
  const sea = scene.add.graphics().setDepth(-70);
  objects.push(sea);
  for (let s = R0 * 2; s <= R1 * 2; s++)
    for (let x = R0; x <= R1; x++) {
      const y = s - x;
      if (y < R0 || y > R1 || isLand(x, y)) continue;
      const d = dWater(x, y);
      if (d > 8) continue;
      const t = clamp((d - 1) / 7, 0, 1);
      const c = t < 0.4 ? lerpC(SHALLOW, MID, t / 0.4) : lerpC(MID, DEEP, (t - 0.4) / 0.6);
      sea.fillStyle(winter ? lerpC(c, 0xcfe0f0, 0.3) : c, 0.97 - t * 0.85);
      diamond(sea, x, y);
      sea.fillPath();
    }
  // sparkles on the water
  const glints = scene.add.graphics().setDepth(-69);
  objects.push(glints);
  glints.fillStyle(0xffffff, 0.55);
  for (let x = R0; x <= R1; x++)
    for (let y = R0; y <= R1; y++) {
      if (isLand(x, y) || dWater(x, y) > 7 || hash(x + 7, y + 3) > 0.12) continue;
      const c = tileCenter(x, y);
      glints.fillEllipse(c.x + (hash(y, x) - 0.5) * 30, c.y + (hash(x, y + 9) - 0.5) * 12, 9, 2.5);
    }

  // --- land: sand cliffs along the sea edge, then every tile ---
  const rim = scene.add.graphics().setDepth(-60);
  const land = scene.add.graphics().setDepth(-50);
  const foam = scene.add.graphics().setDepth(-49);
  objects.push(rim, land, foam);
  const slab = (x: number, y: number, side: 'S' | 'E', color: number) => {
    const a = side === 'S' ? cartesianToIso(x, y + 1) : cartesianToIso(x + 1, y + 1);
    const b = side === 'S' ? cartesianToIso(x + 1, y + 1) : cartesianToIso(x + 1, y);
    rim.fillStyle(side === 'S' ? shade(color, 0.82) : shade(color, 0.68), 1);
    rim.beginPath();
    rim.moveTo(a.x, a.y);
    rim.lineTo(b.x, b.y);
    rim.lineTo(b.x, b.y + 10);
    rim.lineTo(a.x, a.y + 10);
    rim.closePath();
    rim.fillPath();
  };
  for (let s = EXT.x0 + EXT.y0; s <= EXT.x1 + EXT.y1; s++)
    for (let x = EXT.x0; x <= EXT.x1; x++) {
      const y = s - x;
      if (y < EXT.y0 || y > EXT.y1 || !isLand(x, y)) continue;
      // far edges fade into haze, like distance
      const f = clamp((EXT.x1 - x) / 7, 0, 1) * clamp((y - EXT.y0) / 7, 0, 1);
      let c = terrainColor(x, y, pal, theme);
      if (f < 1) c = lerpC(c, HAZE, (1 - f) * 0.85);
      const edgeSand = lerpC(0xe2c98f, HAZE, (1 - f) * 0.85);
      if (!isLand(x, y + 1)) slab(x, y, 'S', edgeSand);
      if (!isLand(x + 1, y)) slab(x, y, 'E', edgeSand);
      land.fillStyle(c, 0.35 + 0.65 * f);
      diamond(land, x, y);
      land.fillPath();
      // crop rows on the farm fields
      if (x >= 0 && y >= 0 && x < TOWN && y < TOWN && regionAt(x, y) === 'country' && x < 15) {
        land.lineStyle(1, shade(c, 0.82), 0.7);
        for (let k = 1; k <= 3; k++) {
          const p = cartesianToIso(x, y + k / 4), q = cartesianToIso(x + 1, y + k / 4);
          land.beginPath();
          land.moveTo(p.x, p.y);
          land.lineTo(q.x, q.y);
          land.strokePath();
        }
      }
      // tufts of grass for a little texture
      if (hash(x + 3, y + 5) > 0.82 && dLand(x, y) > 4) {
        const p = tileCenter(x, y);
        land.fillStyle(shade(c, 0.78), 0.8);
        land.fillTriangle(p.x - 2, p.y + 1, p.x, p.y - 5, p.x + 2, p.y + 1);
        land.fillTriangle(p.x + 3, p.y + 3, p.x + 5, p.y - 2, p.x + 7, p.y + 3);
      }
      // foam where the sea meets the sand
      foam.lineStyle(2.5, 0xffffff, 0.8);
      const edges: [boolean, [number, number], [number, number]][] = [
        [!isLand(x, y - 1), [x, y], [x + 1, y]],
        [!isLand(x - 1, y), [x, y], [x, y + 1]],
        [!isLand(x, y + 1), [x, y + 1], [x + 1, y + 1]],
        [!isLand(x + 1, y), [x + 1, y], [x + 1, y + 1]],
      ];
      for (const [wet, a, b] of edges) {
        if (!wet) continue;
        const pa = cartesianToIso(a[0], a[1]), pb = cartesianToIso(b[0], b[1]);
        foam.beginPath();
        foam.moveTo(pa.x, pa.y);
        foam.lineTo(pb.x, pb.y);
        foam.strokePath();
      }
    }

  // --- piers into the sea (your boardwalk planks) ---
  const pier = (x: number, y: number, dx: number, dy: number) => {
    let water = 0;
    for (let i = 0; i < 24 && water < 6; i++) {
      for (const off of [0, 1]) {
        const px = x + dx * i + (dy !== 0 ? off : 0), py = y + dy * i + (dx !== 0 ? off : 0);
        const key = i === 0 || water >= 5 ? 'bw_light' : 'bw_dark';
        if (!scene.textures.exists(key)) continue;
        const c = tileCenter(px, py);
        const im = scene.add.image(c.x, c.y, key).setOrigin(0.5, 0.39).setDepth(-30);
        im.setScale((DW.get(key) ?? im.width) / im.width);
        objects.push(im);
      }
      if (!isLand(x + dx * i, y + dy * i)) water++;
    }
  };
  pier(0, 21, -1, 0);
  pier(21, 31, 0, 1);

  // --- mountain peaks, with the snow line lower in winter ---
  const peaks = scene.add.graphics().setDepth(-44);
  objects.push(peaks);
  const snow = winter ? 0xffffff : 0xf4f6fa;
  const PEAKS: [number, number, number, number][] = [
    [34, -4, 5, 250], [28, -7, 6, 300], [22, -6, 5, 220], [38, 3, 5, 230], [18, -3, 4, 170], [34, 9, 4, 140], [26, -4, 4, 190],
  ];
  PEAKS.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [px, py, size, h] of PEAKS) drawPeak(peaks, px, py, size, h, 0x8f8680, snow);

  // --- trees: forests on the hills and mountains, palms on the beaches (one graphics per row) ---
  const lotTiles = new Set<string>();
  for (const l of LOTS) for (let i = -1; i <= l.w; i++) for (let j = -1; j <= l.d; j++) lotTiles.add(`${l.x + i},${l.y + j}`);
  const rows = new Map<number, Phaser.GameObjects.Graphics>();
  const rowGfx = (s: number) => {
    let g = rows.get(s);
    if (!g) {
      g = scene.add.graphics().setDepth(s + 0.3);
      rows.set(s, g);
      objects.push(g);
    }
    return g;
  };
  for (let x = EXT.x0; x <= EXT.x1; x++)
    for (let y = EXT.y0; y <= EXT.y1; y++) {
      if (!isLand(x, y) || lotTiles.has(`${x},${y}`)) continue;
      const r = hash(x * 1.7, y * 2.3);
      const region = regionAt(x, y);
      const inCore = x >= 0 && y >= 0 && x < TOWN && y < TOWN;
      const f = clamp((EXT.x1 - x) / 7, 0, 1) * clamp((y - EXT.y0) / 7, 0, 1);
      if (f < 0.25) continue;
      const beach = dLand(x, y) <= 3.5 && (!inCore || x < 3 || y > 26);
      const onPeak = PEAKS.some(([px, py, size]) => Math.abs(px - x) < size / 2 + 0.5 && Math.abs(py - y) < size / 2 + 0.5);
      if (onPeak) continue;
      if (beach && dLand(x, y) > 1.5 && r < 0.07 && region === 'coast') drawPalm(rowGfx(x + y), x + 0.5, y + 0.5, Math.floor(r * 100));
      else if (!beach && !inCore && r < (region === 'mountain' ? 0.34 : 0.3)) region === 'mountain' || r < 0.12 ? drawPine(rowGfx(x + y), x + 0.5, y + 0.5) : drawTree(rowGfx(x + y), x + 0.5, y + 0.5, Math.floor(r * 30));
      else if (inCore && region === 'country' && x >= 15 && r < 0.22) drawTree(rowGfx(x + y), x + 0.5, y + 0.5, Math.floor(r * 30));
      else if (inCore && region === 'mountain' && r < 0.3) drawPine(rowGfx(x + y), x + 0.5, y + 0.5);
      else if (inCore && region === 'campus' && r < 0.08) drawTree(rowGfx(x + y), x + 0.5, y + 0.5, Math.floor(r * 30));
    }
  return { objects };
}

/** Whole painted world, as a camera target. */
export const WORLD_CENTER = tileCenter(15.5, 17);
