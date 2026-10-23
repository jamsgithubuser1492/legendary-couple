import Phaser from 'phaser';
import { DPR } from './render';
import { useSyncExternalStore } from 'react';
import { themeForDate, type Theme } from '../state/season';
import { firefliesInSeason, fireflyFade, weatherRule, type Weather, type WeatherChoice } from '../state/weather';
import { getState } from '../state/store';
import { LOTS, TOWN, growthOf, regionOf, unlockedRegions } from '../state/town';
import { tilesOf } from '../state/placement';
import { GRID_SIZE, tileCenter } from './iso';
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
      this.flyFade = this.weather === 'clear' && (flyForce || firefliesInSeason(now)) ? fireflyFade(hour) : 0;
      this.notedTiles();
      const key = `${this.weather}|${this.calm}|${this.q}`;
      if (key !== this.weatherKey) {
        this.weatherKey = key;
        this.buildFx();
      }
    }
    this.zk = Phaser.Math.Clamp((0.9 * DPR) / zoom, 1, 2);
    this.spawn(dt, view);
    this.moveCritters(dt, view);
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
    if (day && this.nextGull <= 0 && count('gull') < 2) {
      this.nextGull = R(9, 18);
      const left = Math.random() < 0.5;
      const frames = [1, 2, 3, 4].map((n) => `sk_gull_${n}`).filter(this.has);
      if (frames.length) this.add('gull', frames[0], left ? view.x - 40 : view.right + 40, view.y + view.height * R(0.1, 0.55), (left ? 1 : -1) * R(50, 80), 0, frames);
    }
    if (day && this.nextFinch <= 0 && count('finch') + count('perch') < 3) {
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
    if (day && (this.theme === 'spring' || this.theme === 'summer') && this.nextBfly <= 0 && count('bfly') < 3) {
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
    if (x < 0 || y < 0 || x >= TOWN || y >= TOWN || y > 24) return false; // below that is the beach
    if (!isLand(x, y) || !isLand(x + 2, y) || !isLand(x - 2, y) || !isLand(x, y + 2) || !isLand(x, y - 2)) return false;
    const region = regionOf(x, y);
    if (region !== 'coast' && region !== 'country') return false;
    if (!unlockedRegions(growthOf(getState())).includes(region)) return false;
    return !LOTS.some((l) => x >= l.x - 1 && x <= l.x + l.w && y >= l.y - 1 && y <= l.y + l.d);
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
