import Phaser from 'phaser';
import { DPR } from './render';
import { useSyncExternalStore } from 'react';
import { getTheme, type Theme } from '../state/season';

/**
 * Sky life and weather for the world maps (island and town). Gulls, finches, butterflies and fireflies drift through
 * the part of the map you are looking at; rain and snow are a soft overlay on the screen. All of it is cosmetic and
 * non interactive, so it never gets in the way of a tap.
 */

export type Weather = 'clear' | 'rain' | 'snow';
export type WeatherChoice = 'auto' | Weather;

const KEY = 'olw:weather';
let choice: WeatherChoice = (() => {
  try {
    const v = localStorage.getItem(KEY);
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

/** The same weather for both phones: a hash of the local date and the season, unless you chose one. */
export function weatherFor(d: Date, theme: Theme): Weather {
  if (choice !== 'auto') return choice;
  const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
  const r = ((h >>> 0) % 1000) / 1000;
  if (theme === 'winter' || theme === 'holidays') return r < 0.7 ? 'snow' : 'clear';
  if (theme === 'spring' || theme === 'autumn') return r < 0.25 ? 'rain' : 'clear';
  return 'clear';
}

const isNight = (h: number) => h >= 20 || h < 6;
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
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const DEPTH = 4000;
const PAD = 120; // overlay tints reach past the screen edge so a fast pan never shows a seam

interface Critter {
  kind: 'gull' | 'finch' | 'perch' | 'bfly' | 'ffly';
  im: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  life: number;
  frames?: string[];
}

export class SkyLife {
  private critters: Critter[] = [];
  private root: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private weather: Weather = 'clear';
  private weatherKey = '';
  private flakes: { im: Phaser.GameObjects.Image; x: number; y: number; vy: number; sw: number; ph: number }[] = [];
  private drops: { x: number; y: number; len: number; sp: number }[] = [];
  private ripples: { im: Phaser.GameObjects.Image; t: number; life: number }[] = [];
  private snowTile?: Phaser.GameObjects.TileSprite;
  private t = 0;
  private hourT = 99;
  private night = false;
  private dusk = 0;
  private zk = 1; // creatures grow a little when the map is zoomed out, so they stay visible
  private theme: Theme = 'summer';
  private nextGull = 3;
  private nextFinch = 7;
  private nextBfly = 1;
  private dead = false;
  private calm = calmWanted();
  private q = lowEnd() ? 0.5 : 1; // how many particles we can afford
  private counts: Record<Critter['kind'], number> = { gull: 0, finch: 0, perch: 0, bfly: 0, ffly: 0 };
  private rect = new Phaser.Geom.Rectangle();
  private out = new Phaser.Geom.Rectangle();
  private unsub?: () => void;

  constructor(private scene: Phaser.Scene) {
    live.get(scene)?.destroy(); // never two of us in one scene
    live.set(scene, this);
    this.unsub = subscribe(() => { this.hourT = 99; }); // a new weather choice shows at once
    this.root = scene.add.container(0, 0).setDepth(DEPTH + 10);
    this.g = scene.add.graphics();
    this.root.add(this.g);
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
    this.counts = { gull: 0, finch: 0, perch: 0, bfly: 0, ffly: 0 };
    this.clearOverlay();
    this.root.destroy();
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
    // refresh the hour, the season and the weather once in a while
    this.hourT += dt;
    if (this.hourT > 2) {
      this.hourT = 0;
      this.calm = calmWanted();
      const now = new Date();
      this.night = isNight(now.getHours());
      this.theme = getTheme();
      const wx = weatherFor(now, this.theme);
      const key = `${wx}|${this.theme}|${this.calm}|${cam.width}x${cam.height}`;
      if (key !== this.weatherKey) {
        this.weatherKey = key;
        this.weather = wx;
        this.buildOverlay();
      }
    }
    this.zk = Phaser.Math.Clamp((0.9 * DPR) / zoom, 1, 2);
    this.root.setPosition(view.centerX, view.centerY).setScale(1 / zoom);
    this.spawn(dt, view);
    this.moveCritters(dt, view);
    this.drawWeather(dt, cam);
  }

  // ---------------------------------------------------------------- creatures
  private spawn(dt: number, view: Phaser.Geom.Rectangle) {
    const count = (k: Critter['kind']) => this.counts[k];
    const day = !this.night && this.weather !== 'rain' && !this.calm;
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
    if (false as boolean) { // fireflies retired: they read as distracting white blobs
      const want = this.calm ? 0 : Math.round(12 * this.q);
      while (count('ffly') < want) {
        const k = `sk_ffly_${1 + Math.floor(Math.random() * 5)}`;
        if (!this.has(k)) break;
        this.add('ffly', k, view.x + view.width * R(0, 1), view.y + view.height * R(0.2, 0.95), R(-6, 6), R(-6, 6));
      }
    }
  }

  private add(kind: Critter['kind'], key: string, x: number, y: number, vx: number, vy: number, frames?: string[], life = 999) {
    const im = this.scene.add.image(x, y, key).setDepth(DEPTH).setOrigin(0.5);
    const sc = kind === 'ffly' ? 1.2 : kind === 'gull' ? 1 : kind === 'bfly' ? 0.95 : 0.9;
    im.setScale(sc * this.zk);
    if (kind === 'ffly') im.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    if (kind === 'perch') im.setAlpha(0);
    this.critters.push({ kind, im, x, y, vx, vy, ph: R(0, 6), life, frames });
    this.counts[kind]++;
  }

  private moveCritters(dt: number, view: Phaser.Geom.Rectangle) {
    const out = this.out.setTo(view.x, view.y, view.width, view.height);
    Phaser.Geom.Rectangle.Inflate(out, view.width * 0.4, view.height * 0.4);
    const keep: Critter[] = [];
    this.counts = { gull: 0, finch: 0, perch: 0, bfly: 0, ffly: 0 };
    for (const c of this.critters) {
      c.ph += dt;
      c.life -= dt;
      let gone = c.life <= 0 && c.kind !== 'perch' && c.kind !== 'bfly' && c.kind !== 'ffly';
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
      } else if (c.kind === 'bfly') {
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
      } else {
        c.x += c.vx * dt + Math.sin(c.ph * 0.7) * 5 * dt;
        c.y += c.vy * dt + Math.cos(c.ph * 0.9) * 5 * dt;
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(c.ph * 2.2));
        c.im.setAlpha(this.night ? Math.min(c.im.alpha + dt, a) : 0);
        c.im.setScale((1 + 0.3 * a) * this.zk);
        gone = !this.night && c.im.alpha <= 0;
      }
      c.im.setPosition(c.x, c.y);
      if (gone || !Phaser.Geom.Rectangle.Contains(out, c.x, c.y)) {
        // fireflies and butterflies that drift off the view are replaced from inside it by the spawner
        c.im.destroy();
      } else {
        keep.push(c);
        this.counts[c.kind]++;
      }
    }
    this.critters = keep;
  }

  // ---------------------------------------------------------------- weather
  private clearOverlay() {
    this.overlay.forEach((o) => o.destroy());
    this.overlay = [];
    this.flakes = [];
    this.drops = [];
    this.ripples = [];
    this.snowTile = undefined;
    this.g?.clear();
  }

  private buildOverlay() {
    this.clearOverlay();
    const cam = this.scene.cameras.main;
    const W = cam.width, H = cam.height;
    if (this.calm) return; // reduced motion: the weather stays out of the way
    if (this.weather === 'snow') {
      const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `sk_flake_${n}`).filter(this.has);
      for (let i = 0; i < Math.round(38 * this.q) && keys.length; i++) {
        const im = this.scene.add.image(0, 0, pick(keys)).setAlpha(R(0.55, 0.95)).setScale(R(0.35, 0.7) * DPR);
        this.root.add(im);
        this.overlay.push(im);
        this.flakes.push({ im, x: R(-W / 2, W / 2), y: R(-H / 2, H / 2), vy: R(24, 55) * DPR, sw: R(8, 24) * DPR, ph: R(0, 6) });
      }
      if (this.has('sk_snowtile_1')) {
        this.snowTile = this.scene.add.tileSprite(0, 0, W + PAD * 2, H + PAD * 2, 'sk_snowtile_1').setAlpha(0.5).setTileScale(1.4 * DPR);
        this.root.add(this.snowTile);
        this.root.sendToBack(this.snowTile);
        this.overlay.push(this.snowTile);
      }
    } else if (this.weather === 'rain') {
      for (let i = 0; i < Math.round(70 * this.q); i++) this.drops.push({ x: R(-W / 2, W / 2), y: R(-H / 2, H / 2), len: R(10, 20) * DPR, sp: R(380, 520) * DPR });
      for (let i = 0; i < 6; i++) {
        const k = `sk_ripple_${1 + (i % 3)}`;
        if (!this.has(k)) break;
        const im = this.scene.add.image(R(-W / 2, W / 2), R(0, H / 2), k).setAlpha(0).setScale(0.8 * DPR);
        this.root.add(im);
        this.overlay.push(im);
        this.ripples.push({ im, t: R(0, 1.2), life: 1.2 });
      }
    }
  }

  private drawWeather(dt: number, cam: Phaser.Cameras.Scene2D.Camera) {
    const W = cam.width, H = cam.height;
    const g = this.g;
    g.clear();
    // a soft blue dusk at night, so the fireflies have something to glow against
    this.dusk += ((this.night ? 1 : 0) - this.dusk) * Math.min(1, dt * 0.8);
    if (false as boolean) { // the dusk tint went with the fireflies
      g.fillStyle(0x1b2a5e, 0.24 * this.dusk);
      g.fillRect(-W / 2 - PAD, -H / 2 - PAD, W + PAD * 2, H + PAD * 2);
    }
    if (this.weather === 'snow' && !this.calm) {
      for (const f of this.flakes) {
        f.y += f.vy * dt;
        f.ph += dt;
        if (f.y > H / 2 + 20) {
          f.y = -H / 2 - 20;
          f.x = R(-W / 2, W / 2);
        }
        f.im.setPosition(f.x + Math.sin(f.ph) * f.sw, f.y).setAngle(f.ph * 20);
      }
      if (this.snowTile) {
        this.snowTile.setSize(W + PAD * 2, H + PAD * 2);
        this.snowTile.tilePositionY -= 30 * DPR * dt;
        this.snowTile.tilePositionX += 8 * DPR * dt;
      }
      g.fillStyle(0xe6f0ff, 0.06);
      g.fillRect(-W / 2 - PAD, -H / 2 - PAD, W + PAD * 2, H + PAD * 2);
    } else if (this.weather === 'rain' && !this.calm) {
      g.fillStyle(0x7d9bc4, 0.1);
      g.fillRect(-W / 2 - PAD, -H / 2 - PAD, W + PAD * 2, H + PAD * 2);
      g.lineStyle(1.5 * DPR, 0xcfe4ff, 0.55);
      for (const d of this.drops) {
        d.y += d.sp * dt;
        d.x -= d.sp * 0.18 * dt;
        if (d.y > H / 2 || d.x < -W / 2 - 20) {
          d.y = -H / 2 - 20;
          d.x = R(-W / 2, W / 2 + 60);
        }
        g.lineBetween(d.x, d.y, d.x + d.len * 0.18, d.y - d.len);
      }
      for (const r of this.ripples) {
        r.t += dt;
        if (r.t > r.life) {
          r.t = 0;
          r.im.setPosition(R(-W / 2, W / 2), R(-H * 0.05, H / 2));
        }
        const k = r.t / r.life;
        r.im.setAlpha(Math.sin(Math.PI * k) * 0.8).setScale((0.6 + k * 0.7) * DPR);
      }
    }
  }
}
