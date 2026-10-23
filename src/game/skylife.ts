import Phaser from 'phaser';
import { DPR } from './render';
import { useSyncExternalStore } from 'react';
import { themeForDate, type Theme } from '../state/season';
import { firefliesInSeason, fireflyFade, weatherRule, type Weather, type WeatherChoice } from '../state/weather';
import { getState } from '../state/store';
import { LOTS, TOWN, growthOf, regionOf, unlockedRegions } from '../state/town';
import { tilesOf } from '../state/placement';
import { itemOf } from '../state/catalog';
import { GRID_SIZE, isoToCartesian, tileCenter } from './iso';
import { isLand } from './town/world';

/**
 * Sky life and weather for the world maps (island and town). Gulls, finches and butterflies drift through the part of
 * the map you are looking at. Rain, snow and fireflies are painted into the world itself at world scale: zoom out and the
 * drops, flakes and glowing swarms get smaller with everything else, exactly like real things would. All of it follows
 * the real calendar (not a previewed season), is cosmetic and non interactive, and never gets in the way of a tap.
 */

export type { Weather, WeatherChoice };

const KEY = 'olw:weather';
const FLY_KEY = 'olw:fireflies';
let flyForce = false; // testing only: olw:weather=fireflies or olw:fireflies=1 shows the swarms out of season
let choice: WeatherChoice = (() => {
  try {
    const v = localStorage.getItem(KEY);
    flyForce = v === 'fireflies' || localStorage.getItem(FLY_KEY) === '1';
    if (v === 'fireflies') return 'clear';
    return v === 'clear' || v === 'rain' || v === 'snow' ? v : 'auto';
  } catch {
    return 'auto';
  }
})();
const listeners = new Set<() => void>();
export const getWeatherChoice = () => choice;
export function setWeatherChoice(c: WeatherChoice) {
  choice = c;
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const useWeatherChoice = () => useSyncExternalStore(subscribe, getWeatherChoice);

/** The same weather for both phones: see weatherRule in state/weather.ts. A chosen weather ignores the season. */
export const weatherFor = (d: Date, theme: Theme = themeForDate(d)): Weather => weatherRule(d, theme, choice);
export { firefliesInSeason, fireflyFade };

/** People who ask their device for less motion get a still scene: no flapping, no falling rain or snow. */
const calmWanted = () => {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};
/** Fewer flakes, drops and fireflies on small or slow phones. */
const lowEnd = () => {
  try {
    const n = navigator as Navigator & { deviceMemory?: number };
    return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 2;
  } catch {
    return false;
  }
};
const live = new WeakMap<Phaser.Scene, SkyLife>();
const R = (a: number, b: number) => a + Math.random() * (b - a);
const DEPTH = 4000;
const PAD = 160; // weather layers reach past the view (in world units) so a fast pan never shows a seam

interface Critter {
  kind: 'gull' | 'finch' | 'perch' | 'bfly';
  im: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  life: number;
  frames?: string[];
}

/** One tile layer of rain or snow. Scale and speed are in world units, so zooming the map zooms the weather too. */
interface Layer {
  ts: Phaser.GameObjects.TileSprite;
  kind: 'rain' | 'snow';
  scale: number; // world size of one texture pixel
  vx: number; // world units a second the pattern travels
  vy: number;
  ox: number;
  oy: number;
  phase: number; // frame offset so two layers never show the same picture
  fps: number;
  frame: number;
  sway: number;
}

interface Swarm {
  im: Phaser.GameObjects.Image;
  x: number; // world position
  y: number;
  ph: number;
  wob: number;
}

interface Ripple {
  im: Phaser.GameObjects.Image;
  t: number;
  life: number;
}

/** What one raindrop, flake or firefly measures in the world (the map's tile is 64 by 32 and a person about 54 tall). */
const RAIN_LAYERS: { scale: number; speed: number; slant?: number; alpha: number }[] = [
  { scale: 0.24, speed: 380, slant: 0.42, alpha: 0.5 }, // far drops: short streaks, about 20 px
  { scale: 0.36, speed: 560, slant: 0.42, alpha: 0.75 }, // near drops: about 35 px, a little over one tile high at most
];
const SNOW_LAYERS: { scale: number; speed: number; slant?: number; alpha: number }[] = [
  { scale: 0.5, speed: 22, alpha: 0.75 }, // small flakes, 4 to 14 px across
  { scale: 0.8, speed: 34, alpha: 0.8 }, // the biggest flake is about 22 px, well under half a person
];
const SWARM_SCALE = 0.24; // a swarm is about 53 px across, a little under one tile

/**
 * The birds and butterflies from sheet WX2 are saved at twice their world size and drawn at BS. On this map one metre is
 * about 32 px (a 54 px person is about 1.7 m), so a sparrow spans about 9 px in flight and sits about 7 px long, a gull
 * spans about 34 px (a bit over a metre) and a butterfly about 6 px. They live in world space, so zooming scales them
 * with the rest of the map.
 */
const BS = 0.5;
const GULL_ALT = 62; // about 2 m up: how far a gull's ground shadow sits below it
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

interface Spot { x: number; y: number } // where a sparrow's feet rest (a roof ridge, a bench, the lawn)

interface Sparrow {
  im: Phaser.GameObjects.Image;
  x: number;
  y: number;
  sx: number; // where this flight started
  sy: number;
  ox: number; // this bird's place in the flock
  oy: number;
  mode: 'perch' | 'fly';
  t: number; // time in the current mode
  dur: number; // flight length, seconds
  delay: number; // takes off a moment after the leader, so a flock does not move as one
  hop: number;
  glideAt: number;
  ph: number;
}

interface Flock {
  birds: Sparrow[];
  spot: Spot;
  wait: number; // seconds until the next flight
  leave: boolean;
}

interface Gull {
  im: Phaser.GameObjects.Image;
  x: number; // position on the ground under it
  y: number;
  hd: number;
  ph: number;
  life: number;
  seed: number;
  beat: number; // wing beats left before the next glide
  lb: number; // the last wing beat counted
  glide: number; // seconds of gliding left
  bank: number;
}

interface Fly {
  im: Phaser.GameObjects.Image;
  x: number;
  y: number;
  hd: number;
  ph: number;
  life: number;
  mode: 'flutter' | 'seek' | 'rest';
  t: number;
  tx: number;
  ty: number;
  lead?: Fly; // a pair flutters together
  ox: number;
  oy: number;
}

export class SkyLife {
  private critters: Critter[] = [];
  private weather: Weather = 'clear';
  private weatherKey = '';
  private layers: Layer[] = [];
  private mist?: Phaser.GameObjects.Rectangle;
  private ripples: Ripple[] = [];
  private swarms: Swarm[] = [];
  private flyFade = 0;
  private taken = new Set<string>(); // island tiles with something on them, so fireflies keep to the grass
  private flocks: Flock[] = [];
  private gulls: Gull[] = [];
  private flies: Fly[] = [];
  private sg?: Phaser.GameObjects.Graphics; // soft ground shadows of everything that flies
  private spots: Spot[] = [];
  private hour = 12;
  private nextFlock = 1;
  private nextGull2 = 2;
  private nextFly = 1;
  private t = 0;
  private hourT = 99;
  private zk = 1; // creatures grow a little when the map is zoomed out, so they stay visible
  private theme: Theme = 'summer';
  private nextGull = 3;
  private nextFinch = 7;
  private nextBfly = 1;
  private dead = false;
  private calm = calmWanted();
  private q = lowEnd() ? 0.5 : 1; // how many particles we can afford
  private counts: Record<Critter['kind'], number> = { gull: 0, finch: 0, perch: 0, bfly: 0 };
  private rect = new Phaser.Geom.Rectangle();
  private out = new Phaser.Geom.Rectangle();
  private unsub?: () => void;
  private town: boolean;

  constructor(private scene: Phaser.Scene) {
    live.get(scene)?.destroy(); // never two of us in one scene
    live.set(scene, this);
    this.town = scene.sys.settings.key === 'TownScene';
    this.unsub = subscribe(() => { this.hourT = 99; }); // a new weather choice shows at once
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroy());
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.unsub?.();
    if (live.get(this.scene) === this) live.delete(this.scene);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    for (const c of this.critters) c.im.destroy();
    this.critters = [];
    this.counts = { gull: 0, finch: 0, perch: 0, bfly: 0 };
    this.clearFx();
    this.clearBirds();
  }

  private has = (k: string) => this.scene.textures.exists(k);

  // ---------------------------------------------------------------- per frame
  private update(_time: number, delta: number) {
    if (this.dead || !this.scene.sys.isActive()) return;
    const dt = Math.min(0.05, Math.max(0, delta) / 1000); // a long gap (a hidden tab) never spawns a burst
    this.t += dt;
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom > 0.01 ? cam.zoom : 1;
    // the view from the camera's scroll, not worldView, which is a frame behind while panning
    const w = cam.width / zoom, h = cam.height / zoom;
    const sx = cam.useBounds ? cam.clampX(cam.scrollX) : cam.scrollX;
    const sy = cam.useBounds ? cam.clampY(cam.scrollY) : cam.scrollY;
    const view = this.rect.setTo(sx + cam.width / 2 - w / 2, sy + cam.height / 2 - h / 2, w, h);
    // refresh the hour, the real season and the weather once in a while
    this.hourT += dt;
    if (this.hourT > 2) {
      this.hourT = 0;
      this.calm = calmWanted();
      const now = new Date();
      this.theme = themeForDate(now); // the real season; the Us panel preview only repaints the island
      this.weather = weatherFor(now, this.theme);
      const hour = now.getHours() + now.getMinutes() / 60;
      this.hour = hour;
      this.flyFade = this.weather === 'clear' && (flyForce || firefliesInSeason(now)) ? fireflyFade(hour) : 0;
      this.notedTiles();
      this.spots = this.perchSpots();
      const key = `${this.weather}|${this.calm}|${this.q}`;
      if (key !== this.weatherKey) {
        this.weatherKey = key;
        this.buildFx();
      }
    }
    this.zk = Phaser.Math.Clamp((0.9 * DPR) / zoom, 1, 2);
    this.spawn(dt, view);
    this.moveCritters(dt, view);
    this.birds(dt, view);
    this.moveFx(dt, view);
    this.moveSwarms(dt, view);
  }

  // ---------------------------------------------------------------- creatures
  private spawn(dt: number, view: Phaser.Geom.Rectangle) {
    const count = (k: Critter['kind']) => this.counts[k];
    const hour = new Date().getHours();
    const day = hour >= 6 && hour < 20 && this.weather === 'clear' && !this.calm;
    this.nextGull -= dt;
    this.nextFinch -= dt;
    this.nextBfly -= dt;
    const newGull = this.has('wx2_gull_1'), newBirds = this.has('wx2_sparrow_1') && this.has('wx2_sparrow_perch'), newFly = this.has('wx2_bfly_pink_1'); // the old art only stands in when the new art is missing
    if (day && !newGull && this.nextGull <= 0 && count('gull') < 2) {
      this.nextGull = R(9, 18);
      const left = Math.random() < 0.5;
      const frames = [1, 2, 3, 4].map((n) => `sk_gull_${n}`).filter(this.has);
      if (frames.length) this.add('gull', frames[0], left ? view.x - 40 : view.right + 40, view.y + view.height * R(0.1, 0.55), (left ? 1 : -1) * R(50, 80), 0, frames);
    }
    if (day && !newBirds && this.nextFinch <= 0 && count('finch') + count('perch') < 3) {
      this.nextFinch = R(10, 20);
      if (Math.random() < 0.5 && this.has('sk_perch_1')) {
        this.add('perch', `sk_perch_${1 + Math.floor(Math.random() * 3)}`, view.x + view.width * R(0.15, 0.85), view.y + view.height * R(0.3, 0.8), 0, 0, undefined, R(7, 14));
      } else {
        const k = `sk_finch_${1 + Math.floor(Math.random() * 8)}`;
        if (this.has(k)) {
          const left = Math.random() < 0.5;
          this.add('finch', k, left ? view.x - 30 : view.right + 30, view.y + view.height * R(0.2, 0.7), (left ? 1 : -1) * R(60, 95), 0);
        }
      }
    }
    if (day && !newFly && (this.theme === 'spring' || this.theme === 'summer') && this.nextBfly <= 0 && count('bfly') < 3) {
      this.nextBfly = R(4, 9);
      const k = `sk_bwide_${1 + Math.floor(Math.random() * 5)}`;
      if (this.has(k)) this.add('bfly', k, view.x + view.width * R(0.1, 0.9), view.y + view.height * R(0.25, 0.85), R(-12, 12), R(-8, 8), undefined, R(14, 26));
    }
  }

  private add(kind: Critter['kind'], key: string, x: number, y: number, vx: number, vy: number, frames?: string[], life = 999) {
    const im = this.scene.add.image(x, y, key).setDepth(DEPTH).setOrigin(0.5);
    const sc = kind === 'gull' ? 1 : kind === 'bfly' ? 0.95 : 0.9;
    im.setScale(sc * this.zk);
    if (kind === 'perch') im.setAlpha(0);
    this.critters.push({ kind, im, x, y, vx, vy, ph: R(0, 6), life, frames });
    this.counts[kind]++;
  }

  private moveCritters(dt: number, view: Phaser.Geom.Rectangle) {
    const out = this.out.setTo(view.x, view.y, view.width, view.height);
    Phaser.Geom.Rectangle.Inflate(out, view.width * 0.4, view.height * 0.4);
    const keep: Critter[] = [];
    this.counts = { gull: 0, finch: 0, perch: 0, bfly: 0 };
    for (const c of this.critters) {
      c.ph += dt;
      c.life -= dt;
      let gone = c.life <= 0 && c.kind !== 'perch' && c.kind !== 'bfly';
      if (c.kind === 'gull' || c.kind === 'finch') {
        c.x += c.vx * dt;
        c.y += Math.sin(c.ph * (c.kind === 'gull' ? 1.4 : 5)) * (c.kind === 'gull' ? 10 : 22) * dt;
        const frames = c.frames ?? [];
        if (frames.length) c.im.setTexture(frames[Math.floor(c.ph * 5) % frames.length]);
        c.im.setFlipX(c.vx < 0).setScale((c.kind === 'gull' ? 1 : 0.9) * this.zk);
        c.im.setAlpha(1);
        gone = gone || (c.vx > 0 ? c.x > view.right + 80 : c.x < view.x - 80);
      } else if (c.kind === 'perch') {
        c.im.setScale(0.9 * this.zk).setAlpha(Math.min(1, c.im.alpha + dt * 2));
        if (c.life <= 0) {
          c.im.setAlpha(c.im.alpha - dt * 4);
          c.y -= 40 * dt;
          gone = c.im.alpha <= 0;
        }
      } else {
        c.vx += R(-30, 30) * dt;
        c.vy += R(-30, 30) * dt;
        c.vx = Phaser.Math.Clamp(c.vx, -26, 26);
        c.vy = Phaser.Math.Clamp(c.vy, -20, 20);
        c.x += c.vx * dt;
        c.y += c.vy * dt + Math.sin(c.ph * 3) * 6 * dt;
        c.im.setScale(0.95 * this.zk * (0.35 + 0.65 * Math.abs(Math.sin(c.ph * 9))), 0.95 * this.zk);
        c.im.setAngle(Math.sin(c.ph * 2) * 10);
        c.im.setAlpha(c.life < 2 ? Math.max(0, c.life / 2) : 1);
        gone = c.life <= 0;
      }
      c.im.setPosition(c.x, c.y);
      if (gone || !Phaser.Geom.Rectangle.Contains(out, c.x, c.y)) {
        c.im.destroy();
      } else {
        keep.push(c);
        this.counts[c.kind]++;
      }
    }
    this.critters = keep;
  }

  // ---------------------------------------------------------------- rain and snow, painted at world scale
  private clearFx() {
    for (const l of this.layers) l.ts.destroy();
    this.layers = [];
    this.mist?.destroy();
    this.mist = undefined;
    for (const r of this.ripples) r.im.destroy();
    this.ripples = [];
    for (const s of this.swarms) s.im.destroy();
    this.swarms = [];
  }

  private buildFx() {
    this.clearFx();
    if (this.calm) return; // reduced motion: the weather stays out of the way
    const kind = this.weather === 'rain' ? 'rain' : this.weather === 'snow' ? 'snow' : null;
    if (!kind || !this.has(`wx_${kind}_1`)) return;
    // a faint cool wash over the world while it rains or snows
    this.mist = this.scene.add.rectangle(0, 0, 10, 10, kind === 'rain' ? 0x7d9bc4 : 0xe6f0ff, kind === 'rain' ? 0.07 : 0.04).setOrigin(0, 0).setDepth(DEPTH + 1);
    const defs = kind === 'rain' ? RAIN_LAYERS : SNOW_LAYERS;
    const used = this.q < 1 ? defs.slice(1) : defs; // a slow phone gets only the near layer
    used.forEach((d, i) => {
      const ts = this.scene.add.tileSprite(0, 0, 100, 100, `wx_${kind}_1`).setOrigin(0, 0).setDepth(DEPTH + 2 + i).setAlpha(d.alpha).setTileScale(d.scale);
      const slant = d.slant ?? 0;
      // rain travels along its streaks (down and to the left); snow drifts down and a little sideways
      this.layers.push({ ts, kind, scale: d.scale, vx: kind === 'rain' ? -d.speed * slant : d.speed * 0.25, vy: d.speed, ox: R(0, 400), oy: R(0, 400), phase: i * 2, fps: kind === 'rain' ? 8 : 3, frame: -1, sway: kind === 'snow' ? R(0, 6) : 0 });
    });
    if (kind === 'rain') {
      for (let i = 0; i < Math.round(8 * this.q); i++) {
        const k = `sk_ripple_${1 + (i % 3)}`;
        if (!this.has(k)) break;
        this.ripples.push({ im: this.scene.add.image(0, 0, k).setDepth(DEPTH).setAlpha(0).setScale(0.55), t: R(0, 1.4), life: 1.4 });
      }
    }
  }

  private moveFx(dt: number, view: Phaser.Geom.Rectangle) {
    if (this.mist) this.mist.setPosition(view.x - PAD, view.y - PAD).setSize(view.width + PAD * 2, view.height + PAD * 2);
    for (const l of this.layers) {
      l.ox += l.vx * dt;
      l.oy += l.vy * dt;
      const sway = l.kind === 'snow' ? Math.sin(this.t * 0.6 + l.sway) * 10 : 0;
      const left = view.x - PAD, top = view.y - PAD;
      l.ts.setPosition(left, top).setSize(view.width + PAD * 2, view.height + PAD * 2);
      // texture coordinate at the layer's corner: fixed to the world (so panning moves the weather with the map), plus the fall
      l.ts.tilePositionX = left / l.scale - (l.ox + sway) / l.scale;
      l.ts.tilePositionY = top / l.scale - l.oy / l.scale;
      const f = (Math.floor(this.t * l.fps) + l.phase) % 4;
      if (f !== l.frame) {
        l.frame = f;
        l.ts.setTexture(`wx_${l.kind}_${f + 1}`);
      }
    }
    for (const r of this.ripples) {
      r.t += dt;
      if (r.t > r.life) {
        r.t = 0;
        r.im.setPosition(view.x + Math.random() * view.width, view.y + Math.random() * view.height);
      }
      const k = r.t / r.life;
      r.im.setAlpha(Math.sin(Math.PI * k) * 0.55).setScale(0.4 + k * 0.4);
    }
  }

  // ---------------------------------------------------------------- sparrows, gulls and butterflies (sheet WX2)
  private clearBirds() {
    for (const f of this.flocks) for (const b of f.birds) b.im.destroy();
    for (const g of this.gulls) g.im.destroy();
    for (const f of this.flies) f.im.destroy();
    this.flocks = [];
    this.gulls = [];
    this.flies = [];
    this.sg?.destroy();
    this.sg = undefined;
  }

  /** Is this point of the ground land (or the beach)? Gulls keep to the water around it. */
  private landAt(wx: number, wy: number): boolean {
    const c = isoToCartesian(wx, wy);
    if (!this.town) return c.x > -0.6 && c.y > -0.6 && c.x < GRID_SIZE + 0.6 && c.y < GRID_SIZE + 0.6;
    return isLand(Math.floor(c.x), Math.floor(c.y));
  }

  /** Places where a sparrow may rest: roofs, things you placed, a few bits of lawn. */
  private perchSpots(): Spot[] {
    const out: Spot[] = [];
    const s = getState();
    const lawn = () => {
      const size = this.town ? TOWN : GRID_SIZE;
      for (let i = 0, got = 0; i < 40 && got < 6; i++) {
        const tx = Math.floor(R(0, size)), ty = Math.floor(R(0, size));
        if (!this.grassy(tx, ty)) continue;
        const c = tileCenter(tx, ty);
        out.push({ x: c.x + R(-10, 10), y: c.y + R(-2, 4) });
        got++;
      }
    };
    if (!this.town) {
      if (!s.starterRemoved) {
        const c = tileCenter(4, 4);
        out.push({ x: c.x - 14, y: c.y - 52 }, { x: c.x + 18, y: c.y - 46 }); // the roof ridge of the shop
      }
      for (const o of s.placed.slice(0, 60)) {
        const it = itemOf(o.itemId);
        if (!it || it.layer !== 'object') continue;
        const c = tileCenter(o.tileX, o.tileY);
        out.push({ x: c.x + R(-6, 6), y: c.y - Math.min(30, Math.max(8, it.h * 0.7)) });
      }
      lawn();
    } else {
      const g = growthOf(s), open = unlockedRegions(g);
      for (const l of LOTS) {
        if (!open.includes(l.region) || g < l.at) continue;
        const c = tileCenter(l.x + l.w / 2 - 0.5, l.y + l.d / 2 - 0.5);
        const roof = 24 + 8 * Math.min(l.w, l.d);
        out.push({ x: c.x - R(4, 14), y: c.y - roof }, { x: c.x + R(4, 14), y: c.y - roof + 6 });
      }
      lawn();
    }
    return out;
  }

  private birdShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, alt: number, w: number, a: number) {
    const k = Phaser.Math.Clamp(1 - alt / 220, 0.35, 1); // higher up: smaller and fainter
    g.fillStyle(0x3b2f2a, a * k);
    g.fillEllipse(x, y, w * k, w * k * 0.38);
  }

  private birds(dt: number, view: Phaser.Geom.Rectangle) {
    const scene = this.scene;
    const hour = this.hour;
    const day = hour >= 6 && hour < 20;
    const clear = this.weather === 'clear';
    const useSparrow = this.has('wx2_sparrow_1') && this.has('wx2_sparrow_perch');
    const useGull = this.has('wx2_gull_1');
    const useFly = this.has('wx2_bfly_pink_1') && this.has('wx2_bfly_blue_1');
    if (!useSparrow && !useGull && !useFly) return;
    if (!this.sg) this.sg = scene.add.graphics().setDepth(DEPTH - 1);
    const sg = this.sg;
    sg.clear();
    const flurry = (hour >= 6 && hour < 9) || (hour >= 17 && hour < 20); // a livelier morning and evening, quieter in the midday heat
    const lite = this.q < 1;

    // ---- sparrows: small flocks that hop between perches and take off together
    if (useSparrow) {
      const wantFlocks = !day || !clear ? 0 : this.calm ? 1 : lite ? 1 : flurry ? 2 : hour < 11 || hour >= 15 ? 2 : 1;
      this.nextFlock -= dt;
      const live = this.flocks.filter((f) => !f.leave);
      if (live.length < wantFlocks && this.nextFlock <= 0 && this.spots.length) {
        this.nextFlock = R(4, 9);
        const inView = this.spots.filter((p) => p.x > view.x + view.width * 0.08 && p.x < view.right - view.width * 0.08 && p.y > view.y + view.height * 0.1 && p.y < view.bottom - view.height * 0.08 && !this.flocks.some((f) => Math.hypot(f.spot.x - p.x, f.spot.y - p.y) < 40));
        if (inView.length) {
          const spot = inView[Math.floor(Math.random() * inView.length)];
          const n = this.calm ? 1 + Math.floor(Math.random() * 2) : lite ? 2 : 2 + Math.floor(Math.random() * 3);
          const birds: Sparrow[] = [];
          for (let i = 0; i < n; i++) {
            const ox = (i - (n - 1) / 2) * R(7, 11), oy = R(-1, 1);
            const im = scene.add.image(spot.x + ox, spot.y + oy, 'wx2_sparrow_perch').setOrigin(0.5, 1).setDepth(DEPTH).setScale(BS).setAlpha(0).setFlipX(Math.random() < 0.5);
            birds.push({ im, x: spot.x + ox, y: spot.y + oy, sx: 0, sy: 0, ox, oy, mode: 'perch', t: R(0, 2), dur: 1, delay: i * 0.14 + R(0, 0.12), hop: 0, glideAt: 0, ph: R(0, 6) });
          }
          this.flocks.push({ birds, spot, wait: R(3.5, 9), leave: false });
        }
      }
      for (const f of this.flocks) {
        const inside = f.spot.x > view.x - 120 && f.spot.x < view.right + 120 && f.spot.y > view.y - 120 && f.spot.y < view.bottom + 120;
        if (!inside || !clear || !day) f.leave = true; // out of view, or the weather turned: they drift off
        const flying = f.birds.some((b) => b.mode === 'fly');
        if (!f.leave && !flying && !this.calm) {
          f.wait -= dt;
          if (f.wait <= 0) {
            // somewhere else to land: 3 to 8 tiles away (a tile is about 64 px across)
            const far = this.spots.filter((p) => { const d = Math.hypot(p.x - f.spot.x, p.y - f.spot.y); return d > 110 && d < 340 && p.x > view.x && p.x < view.right && p.y > view.y && p.y < view.bottom; });
            if (far.length) {
              const to = far[Math.floor(Math.random() * far.length)];
              const dist = Math.hypot(to.x - f.spot.x, to.y - f.spot.y);
              const speed = R(95, 125);
              for (const b of f.birds) {
                b.mode = 'fly';
                b.t = -b.delay;
                b.sx = b.x;
                b.sy = b.y;
                b.dur = dist / speed;
                b.glideAt = R(0.35, 0.6);
                b.ox = (b.ox / Math.max(1, Math.abs(b.ox))) * R(4, 10);
                b.oy = R(-2, 2);
                b.hop = to.x >= f.spot.x ? 1 : -1;
              }
              f.spot = to;
            }
            f.wait = R(4, 11);
          }
        }
        let alive = 0;
        for (const b of f.birds) {
          b.ph += dt;
          let key = 'wx2_sparrow_perch', alt = 0, vis = 1;
          if (b.mode === 'fly') {
            b.t += dt;
            if (b.t < 0) {
              key = 'wx2_sparrow_perch';
            } else {
              const u = Math.min(1, b.t / b.dur);
              const tx = f.spot.x + b.ox, ty = f.spot.y + b.oy;
              b.x = b.sx + (tx - b.sx) * u;
              const arc = Math.min(34, Math.hypot(tx - b.sx, ty - b.sy) * 0.16) * Math.sin(Math.PI * u); // up, then down onto the perch
              const bounce = Math.sin(b.t * 9) * 2.4 * Math.sin(Math.PI * u); // the bouncy flight of a small bird
              b.y = b.sy + (ty - b.sy) * u;
              alt = Math.max(0, arc + bounce);
              b.im.setFlipX(tx < b.sx);
              const beat = Math.floor(b.ph * 12) % 4;
              key = b.t < 0.22 ? 'wx2_sparrow_up' : u > 0.9 ? 'wx2_sparrow_flap' : u > b.glideAt && u < b.glideAt + 0.18 ? 'wx2_sparrow_glide' : `wx2_sparrow_${[1, 2, 3, 2][beat]}`;
              if (u >= 1) { b.mode = 'perch'; b.t = 0; b.x = tx; b.y = ty; alt = 0; }
            }
          } else if (!this.calm) {
            // resting: a 1 px breath, a turn of the head, now and then a little hop
            b.t += dt;
            b.hop -= dt;
            alt = b.hop > 0 && b.hop < 0.24 ? Math.sin((b.hop / 0.24) * Math.PI) * 3 : 0;
            if (b.hop <= 0 && Math.random() < dt * 0.4) { b.hop = 0.24; if (Math.random() < 0.5) b.im.setFlipX(!b.im.flipX); }
            else if (Math.random() < dt * 0.35) b.im.setFlipX(!b.im.flipX);
            alt += Math.sin(b.ph * 2.2) * 0.4;
          }
          if (f.leave) { vis = Math.max(0, b.im.alpha - dt * 1.2); } else vis = Math.min(1, b.im.alpha + dt * 1.5);
          if (!this.has(key)) key = 'wx2_sparrow_1';
          if (b.im.texture.key !== key) b.im.setTexture(key);
          b.im.setPosition(b.x, b.y - alt).setAlpha(vis);
          if (vis > 0.02) { alive++; this.birdShadow(sg, b.x + 1, b.y + 1, alt, 7, 0.2 * vis); }
        }
        void alive;
      }
      this.flocks = this.flocks.filter((f) => {
        const gone = f.leave && f.birds.every((b) => b.im.alpha <= 0.02);
        if (gone) for (const b of f.birds) b.im.destroy();
        return !gone;
      });
    } else {
      for (const f of this.flocks) for (const b of f.birds) b.im.destroy();
      this.flocks = [];
    }

    // ---- gulls: slow soaring arcs over the water, flapping then gliding, banking in the turns
    if (useGull) {
      const wantGull = !day || !clear || this.calm ? 0 : lite ? 1 : flurry || hour < 11 || hour >= 14 ? 2 : 1;
      this.nextGull2 -= dt;
      if (this.gulls.filter((g) => g.life > 0).length < wantGull && this.nextGull2 <= 0) {
        this.nextGull2 = R(5, 12);
        for (let i = 0; i < 24; i++) {
          const x = view.x + view.width * R(-0.1, 1.1), y = view.y + view.height * R(0.05, 0.95);
          if (this.landAt(x, y) || this.landAt(x + 60, y) || this.landAt(x - 60, y)) continue;
          const hd = Math.random() < 0.5 ? R(-0.5, 0.5) : Math.PI + R(-0.5, 0.5);
          const im = scene.add.image(x, y - GULL_ALT, 'wx2_gull_1').setDepth(DEPTH).setScale(BS).setAlpha(0);
          this.gulls.push({ im, x, y, hd, ph: R(0, 6), life: R(40, 80), seed: R(0, 6), beat: 3 + Math.floor(Math.random() * 3), glide: 0, bank: 0, lb: -1 });
          break;
        }
      }
      const cx = view.x + view.width / 2, cy = view.y + view.height / 2, reach = Math.hypot(view.width, view.height);
      for (const g of this.gulls) {
        g.ph += dt;
        g.life -= dt;
        const speed = g.glide > 0 ? 78 : 64; // roughly 2 m a second: a lazy crossing of the island in a quarter of a minute
        // turn away from land (look ahead on the ground), otherwise drift in slow arcs
        let want = g.hd + Math.sin(g.ph * 0.35 + g.seed) * 0.5;
        const ahead = (a: number, d: number) => this.landAt(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d);
        if (ahead(g.hd, 90) || ahead(g.hd, 40)) {
          for (let k = 1; k <= 6; k++) {
            const a1 = g.hd + (k * Math.PI) / 6, a2 = g.hd - (k * Math.PI) / 6;
            const ok1 = !ahead(a1, 90), ok2 = !ahead(a2, 90);
            if (ok1 || ok2) { want = ok1 && (!ok2 || Math.random() < 0.5) ? a1 : a2; break; }
          }
        } else if (Math.hypot(g.x - cx, g.y - cy) > reach * 0.9) {
          want = Math.atan2(cy - g.y, cx - g.x); // wandered far from the view: come back
        }
        const turn = wrap(want - g.hd);
        g.hd += turn * Math.min(1, dt * 1.1);
        g.x += Math.cos(g.hd) * speed * dt;
        g.y += Math.sin(g.hd) * speed * dt * 0.8;
        g.bank += (Phaser.Math.Clamp(turn, -0.6, 0.6) * 20 - g.bank) * Math.min(1, dt * 2); // lean into the turn
        if (g.glide > 0) g.glide -= dt;
        else if (g.beat <= 0) { g.glide = R(2.2, 4.5); g.beat = 3 + Math.floor(Math.random() * 4); }
        const beat = Math.floor(g.ph * 4.5);
        if (g.glide <= 0 && beat !== g.lb) { g.lb = beat; g.beat--; }
        const left = Math.cos(g.hd) < 0;
        const key = g.glide > 0 ? 'wx2_gull_4' : `wx2_gull_${[1, 2, 3, 2][beat % 4]}`;
        if (g.im.texture.key !== key) g.im.setTexture(key);
        const bob = Math.sin(g.ph * 1.6 + g.seed) * 2.5;
        const fade = g.life < 3 ? Math.max(0, g.life / 3) : Math.min(1, g.im.alpha + dt * 0.8);
        g.im.setFlipX(left).setAngle(left ? -g.bank : g.bank).setPosition(g.x, g.y - GULL_ALT + bob).setAlpha(fade);
        if (fade > 0.05) this.birdShadow(sg, g.x - 8, g.y + 4, GULL_ALT, 16, 0.16 * fade);
      }
      const keepG: Gull[] = [];
      for (const g of this.gulls) {
        const far = Math.hypot(g.x - (view.x + view.width / 2), g.y - (view.y + view.height / 2)) > Math.hypot(view.width, view.height) * 1.6;
        if (!clear || !day) g.life = Math.min(g.life, 3); // rain, snow or dusk: it fades away
        if (g.life <= 0 || far) g.im.destroy(); else keepG.push(g);
      }
      this.gulls = keepG;
    } else {
      for (const g of this.gulls) g.im.destroy();
      this.gulls = [];
    }

    // ---- butterflies: spring and summer days, drifting in loose loops, landing on the lawn for a while
    if (useFly) {
      const warm = (this.theme === 'spring' || this.theme === 'summer') && day && hour >= 8 && hour < 19.5 && clear && !this.calm;
      const wantFly = !warm ? 0 : lite ? 2 : hour >= 10 && hour < 17 ? 3 : 2;
      this.nextFly -= dt;
      if (this.flies.filter((f) => f.life > 0).length < wantFly && this.nextFly <= 0) {
        this.nextFly = R(3, 7);
        const size = this.town ? TOWN : GRID_SIZE;
        for (let i = 0; i < 24; i++) {
          const tx = Math.floor(R(0, size)), ty = Math.floor(R(0, size));
          if (!this.grassy(tx, ty)) continue;
          const c = tileCenter(tx, ty);
          if (!Phaser.Geom.Rectangle.Contains(view, c.x, c.y)) continue;
          const pair = Math.random() < 0.3 && this.flies.length + 2 <= wantFly + 1;
          const key = Math.random() < 0.5 ? 'pink' : 'blue';
          const lead = this.makeFly(c.x, c.y - 8, key);
          this.flies.push(lead);
          if (pair) { const f2 = this.makeFly(c.x + 8, c.y - 4, key === 'pink' ? 'blue' : 'pink'); f2.lead = lead; f2.ox = R(-9, 9); f2.oy = R(-7, 7); this.flies.push(f2); }
          break;
        }
      }
      for (const f of this.flies) {
        f.ph += dt;
        f.t += dt;
        f.life -= dt;
        let alt = 10 + Math.sin(f.ph * 1.3) * 4, flap = 11, squash = 1;
        if (f.lead && f.lead.life > 0) {
          // a pair: the follower trails its partner on a loose string
          f.x += (f.lead.x + f.ox - f.x) * Math.min(1, dt * 1.6);
          f.y += (f.lead.y + f.oy - f.y) * Math.min(1, dt * 1.6);
          f.mode = f.lead.mode === 'rest' ? 'rest' : 'flutter';
          if (f.mode === 'rest') { alt = 2; flap = 2; squash = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(f.ph * 2.4)); }
        } else if (f.mode === 'flutter') {
          f.hd += Math.sin(f.ph * 1.7 + f.ox) * dt * 2.2 + R(-1, 1) * dt * 2.5; // an unhurried figure of eight with the odd stray turn
          const sp = 15 + Math.sin(f.ph * 0.9) * 5;
          f.x += Math.cos(f.hd) * sp * dt;
          f.y += Math.sin(f.hd) * sp * dt * 0.6;
          if (f.t > R(7, 12) && !f.lead) {
            // find a patch of lawn nearby to land on
            for (let i = 0; i < 12; i++) {
              const tx = f.x + R(-130, 130), ty = f.y + R(-70, 70);
              const c = isoToCartesian(tx, ty);
              if (this.grassy(Math.floor(c.x), Math.floor(c.y)) && Phaser.Geom.Rectangle.Contains(view, tx, ty)) { f.tx = tx; f.ty = ty; f.mode = 'seek'; f.t = 0; break; }
            }
            if (f.mode !== 'seek') f.t = 0;
          }
        } else if (f.mode === 'seek') {
          const d = Math.hypot(f.tx - f.x, f.ty - f.y);
          f.hd = Math.atan2(f.ty - f.y, f.tx - f.x);
          f.x += Math.cos(f.hd) * 18 * dt;
          f.y += Math.sin(f.hd) * 18 * dt;
          alt = Math.min(alt, Math.max(2, d * 0.3));
          if (d < 3) { f.mode = 'rest'; f.t = 0; }
        } else {
          // resting on the grass with the wings slowly opening and closing
          alt = 2;
          flap = 2;
          squash = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(f.ph * 2.4));
          if (f.t > R(3, 6.5) && !f.lead) { f.mode = 'flutter'; f.t = 0; f.hd = R(0, 6.28); }
        }
        const k = `wx2_bfly_${f.im.getData('hue') as string}_${1 + (Math.floor(f.ph * flap) % 4)}`;
        if (this.has(k) && f.im.texture.key !== k) f.im.setTexture(k);
        const fade = f.life < 2 ? Math.max(0, f.life / 2) : Math.min(1, f.im.alpha + dt * 1.2);
        f.im.setScale(BS * squash, BS).setAngle(Math.sin(f.ph * 2) * 8).setPosition(f.x, f.y - alt).setAlpha(fade);
        if (fade > 0.05) this.birdShadow(sg, f.x, f.y + 1, alt, 5, 0.14 * fade);
      }
      const keepF: Fly[] = [];
      const room = Phaser.Geom.Rectangle.Inflate(this.out.setTo(view.x, view.y, view.width, view.height), 160, 120);
      for (const f of this.flies) {
        if (!warm) f.life = Math.min(f.life, 2); // rain or the cool of the evening: they settle out of sight
        if (f.life <= 0 || !Phaser.Geom.Rectangle.Contains(room, f.x, f.y)) f.im.destroy(); else keepF.push(f);
      }
      this.flies = keepF;
    } else {
      for (const f of this.flies) f.im.destroy();
      this.flies = [];
    }
  }

  private makeFly(x: number, y: number, hue: 'pink' | 'blue'): Fly {
    const im = this.scene.add.image(x, y, `wx2_bfly_${hue}_1`).setDepth(DEPTH).setScale(BS).setAlpha(0).setData('hue', hue);
    return { im, x, y, hd: R(0, 6.28), ph: R(0, 6), life: R(40, 90), mode: 'flutter', t: R(0, 4), tx: x, ty: y, ox: R(0, 6), oy: 0 };
  }

  // ---------------------------------------------------------------- fireflies
  /** Island tiles that have something placed on them. */
  private notedTiles() {
    if (this.town) return;
    this.taken.clear();
    for (const o of getState().placed) for (const t of tilesOf(o.itemId, o.tileX, o.tileY, o.rotation)) this.taken.add(`${t.x},${t.y}`);
  }

  /** Is this a tile where a swarm may hover: open grass, away from buildings and from the shore. */
  private grassy(x: number, y: number): boolean {
    if (!this.town) {
      if (x < 1 || y < 1 || x > GRID_SIZE - 2 || y > GRID_SIZE - 2) return false;
      if (Math.abs(x - 4) <= 1 && Math.abs(y - 4) <= 1) return false; // the starter building
      return !this.taken.has(`${x},${y}`);
    }
    if (x < 0 || y < 0 || x >= TOWN || y >= TOWN || y > 26) return false; // below that is the beach
    if (!isLand(x, y) || !isLand(x - 1, y) || !isLand(x, y + 1)) return false;
    const region = regionOf(x, y);
    if (region === 'downtown') return false; // streets and towers, no meadow
    if (!unlockedRegions(growthOf(getState())).includes(region)) return false;
    return !LOTS.some((l) => x >= l.x && x < l.x + l.w && y >= l.y && y < l.y + l.d);
  }

  private moveSwarms(dt: number, view: Phaser.Geom.Rectangle) {
    const want = this.calm || this.flyFade <= 0.02 || !this.has('wx_firefly_1') ? 0 : Math.round(6 * this.q);
    const out = this.out.setTo(view.x, view.y, view.width, view.height);
    Phaser.Geom.Rectangle.Inflate(out, 40, 40);
    // let go of swarms that are out of view, or all of them when the evening is over
    this.swarms = this.swarms.filter((s) => {
      const keep = want > 0 && Phaser.Geom.Rectangle.Contains(out, s.x, s.y);
      if (!keep) s.im.destroy();
      return keep;
    });
    // a new swarm now and then, never a burst
    if (this.swarms.length < want && Math.random() < dt * 1.2) {
      const size = this.town ? TOWN : GRID_SIZE;
      for (let tries = 0; tries < 24; tries++) {
        const tx = Math.floor(R(0, size)), ty = Math.floor(R(0, size));
        if (!this.grassy(tx, ty)) continue;
        const c = tileCenter(tx, ty);
        const x = c.x + R(-18, 18), y = c.y - R(8, 22);
        if (!Phaser.Geom.Rectangle.Contains(view, x, y)) continue;
        if (this.swarms.some((s) => Math.abs(s.x - x) < 70 && Math.abs(s.y - y) < 40)) continue;
        const im = this.scene.add.image(x, y, 'wx_firefly_1').setDepth(DEPTH).setScale(SWARM_SCALE).setAlpha(0).setTint(0xffc65a); // a warm gold, so the glow reads on a light map
        this.swarms.push({ im, x, y, ph: R(0, 6), wob: R(0, 6) });
        break;
      }
    }
    for (const s of this.swarms) {
      s.ph += dt;
      s.wob += dt;
      const px = s.x + Math.sin(s.wob * 0.5) * 7, py = s.y + Math.cos(s.wob * 0.7) * 4;
      // pulse through the eight frames, bright to faint and back
      const p = 0.5 + 0.5 * Math.sin(s.ph * 0.9);
      const f = 1 + Math.round((1 - p) * 7);
      s.im.setTexture(`wx_firefly_${f}`).setPosition(px, py);
      s.im.setAlpha(s.im.alpha + (0.95 * this.flyFade - s.im.alpha) * Math.min(1, dt * 1.5));
    }
  }
}
