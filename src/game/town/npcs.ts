import Phaser from 'phaser';
import { findPath, tileCenter } from '../iso';
import { NPC_STRIPS } from '../npcSheets';

/**
 * Townsfolk with real walk cycles (cut from art/source/sheet40_npc_walks.jpg).
 * The sheet has no back facing views, so walking away from the camera uses the side view. Screen right and left
 * are the east and west strips, and walking toward the camera uses the front view.
 */
export interface NpcDef {
  id: string;
  e: string; // strip that faces screen right
  w?: string; // strip that faces screen left (omit to mirror the east strip)
  s?: string; // strip that faces the camera
  speed: number; // tiles per second
  scale: number;
}

export const NPC_DEFS: NpcDef[] = [
  { id: 'elder', e: 'npc_elder_w', s: 'npc_elder_s', speed: 0.8, scale: 0.29 }, // her west strip is mirrored for east
  { id: 'photo', e: 'npc_photo_e', w: 'npc_photo_s', s: 'npc_photo_s2', speed: 1.4, scale: 0.29 },
  { id: 'hiker', e: 'npc_hiker_e', w: 'npc_hiker_w', s: 'npc_hiker_s', speed: 1.7, scale: 0.29 },
  { id: 'sunhat', e: 'npc_sunhat_e', s: 'npc_sunhat_s', speed: 1.3, scale: 0.29 },
  { id: 'courier', e: 'npc_courier_e', speed: 2.1, scale: 0.28 },
];
/** Which way each drawn strip actually faces, so the other side can be made by mirroring it. */
const NATIVE: Record<string, 'e' | 'w'> = {
  npc_elder_w: 'w', npc_photo_e: 'e', npc_photo_s: 'w', npc_hiker_e: 'e', npc_hiker_w: 'w', npc_sunhat_e: 'e', npc_courier_e: 'e',
};

export function preloadNpcStrips(scene: Phaser.Scene) {
  for (const [name, m] of Object.entries(NPC_STRIPS)) scene.load.spritesheet(name, `${name}.png`, { frameWidth: m.fw, frameHeight: m.fh });
}

export function createNpcAnims(scene: Phaser.Scene) {
  for (const [name, m] of Object.entries(NPC_STRIPS)) {
    const key = `${name}_walk`;
    if (scene.anims.exists(key) || !scene.textures.exists(name)) continue;
    scene.anims.create({ key, frames: Array.from({ length: m.frames }, (_, frame) => ({ key: name, frame })), frameRate: 8, repeat: -1 });
  }
}

type Face = 'e' | 'w' | 's';
type Pt = { x: number; y: number };
const ACCEL = 2.4; // tiles per second squared

/** One walking townsperson: picks a place to go, walks there at a natural pace, stops and looks around. */
export class TownNpc {
  readonly c: Phaser.GameObjects.Container;
  private img: Phaser.GameObjects.Sprite;
  private pos: Pt; // tile space, fractional
  private route: Pt[] = [];
  private lens: number[] = [];
  private dist = 0;
  private speed = 0;
  private top: number;
  private face: Face = 's';
  private faceAt = 0;
  private idleFor = 1 + Math.random() * 3;
  private lookAt = 0;
  private lastSide: 'e' | 'w' = Math.random() < 0.5 ? 'e' : 'w';
  private phase = Math.random() * 6;
  private strip = '';

  constructor(private scene: Phaser.Scene, readonly def: NpcDef, tile: Pt, tint?: number) {
    this.pos = { ...tile };
    this.top = def.speed * (0.9 + Math.random() * 0.2);
    const shadow = scene.add.ellipse(0, -1, 15, 6, 0x000000, 0.15);
    this.img = scene.add.sprite(0, 0, def.e, 0).setOrigin(0.5, 1).setScale(def.scale);
    if (tint) this.img.setTint(tint);
    this.c = scene.add.container(0, 0, [shadow, this.img]);
    this.place();
    this.setFace('s', true);
  }

  get tile(): Pt {
    return { x: Math.round(this.pos.x), y: Math.round(this.pos.y) };
  }
  get moving() {
    return this.route.length > 0;
  }

  destroy() {
    this.c.destroy();
  }

  teleport(t: Pt) {
    this.route = [];
    this.speed = 0;
    this.pos = { ...t };
    this.place();
    this.setFace('s', true);
  }

  private place(bob = 0) {
    const p = tileCenter(this.pos.x, this.pos.y);
    this.c.setPosition(p.x, p.y + 4 - bob);
    this.c.setDepth(this.pos.x + this.pos.y + 0.2);
  }

  /** Chooses the right strip for a facing, mirroring where the art only exists for one side. */
  private setFace(f: Face, force = false) {
    if (f === this.face && !force) return;
    this.face = f;
    this.faceAt = this.scene.time.now;
    if (f !== 's') this.lastSide = f;
    const d = this.def;
    let strip: string, flip: boolean;
    if (f === 's') {
      strip = d.s ?? (this.lastSide === 'w' && d.w ? d.w : d.e);
      flip = d.s ? false : NATIVE[strip] === (this.lastSide === 'w' ? 'e' : 'w');
    } else if (f === 'e') {
      strip = d.e;
      flip = NATIVE[strip] === 'w';
    } else {
      strip = d.w ?? d.e;
      flip = NATIVE[strip] === 'e';
    }
    this.img.setFlipX(flip);
    this.strip = strip;
    if (this.moving) this.img.play(`${strip}_walk`, true);
    else {
      this.img.stop();
      this.img.setTexture(strip, 0);
    }
  }

  /** Picks a destination and builds a smooth route to it. */
  private depart(blocked: Set<string>, pick: () => Pt | null, size: number) {
    for (let i = 0; i < 6; i++) {
      const goal = pick();
      if (!goal) return;
      const path = findPath(this.tile, goal, blocked, size);
      if (path.length < 2) continue;
      this.route = this.smooth([this.tile, ...path], blocked);
      this.lens = [0];
      for (let k = 1; k < this.route.length; k++) this.lens.push(this.lens[k - 1] + Math.hypot(this.route[k].x - this.route[k - 1].x, this.route[k].y - this.route[k - 1].y));
      this.dist = 0;
      this.speed = 0;
      return;
    }
    this.idleFor = 1 + Math.random() * 2;
  }

  /** Straightens the grid path where the way is clear, then rounds the corners so the walk curves like a person's. */
  private smooth(path: Pt[], blocked: Set<string>): Pt[] {
    const clear = (a: Pt, b: Pt) => {
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = Math.round(a.x + (b.x - a.x) * t), y = Math.round(a.y + (b.y - a.y) * t);
        if (blocked.has(`${x},${y}`)) return false;
      }
      return true;
    };
    const out: Pt[] = [path[0]];
    let i = 0;
    while (i < path.length - 1) {
      let j = path.length - 1;
      while (j > i + 1 && !clear(path[i], path[j])) j--;
      out.push(path[j]);
      i = j;
    }
    // no segment longer than one tile, so corner rounding stays small
    const dense: Pt[] = [out[0]];
    for (let k = 1; k < out.length; k++) {
      const a = out[k - 1], b = out[k], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
      for (let s = 1; s <= n; s++) dense.push({ x: a.x + ((b.x - a.x) * s) / n, y: a.y + ((b.y - a.y) * s) / n });
    }
    let pts = dense;
    for (let it = 0; it < 2; it++) {
      const next: Pt[] = [pts[0]];
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], b = pts[k + 1];
        next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
      }
      next.push(pts[pts.length - 1]);
      pts = next;
    }
    return pts;
  }

  update(dtMs: number, blocked: Set<string>, pick: () => Pt | null, size: number) {
    const dt = Math.min(dtMs, 80) / 1000;
    if (!this.moving) {
      this.idleFor -= dt;
      this.lookAt -= dt;
      if (this.lookAt <= 0) {
        // glance around while standing: the camera, then a side, now and then
        this.lookAt = 0.8 + Math.random() * 1.6;
        const r = Math.random();
        this.setFace(r < 0.5 ? 's' : r < 0.75 ? 'e' : 'w');
      }
      this.place(0);
      if (this.idleFor <= 0) this.depart(blocked, pick, size);
      return;
    }
    // accelerate, cruise, then slow down into the stop
    const total = this.lens[this.lens.length - 1];
    const remaining = total - this.dist;
    const brake = (this.speed * this.speed) / (2 * ACCEL) + 0.02;
    const target = remaining <= brake ? 0.25 : this.top;
    this.speed += Math.sign(target - this.speed) * Math.min(Math.abs(target - this.speed), ACCEL * dt);
    this.dist = Math.min(total, this.dist + Math.max(this.speed, 0.12) * dt);
    // locate on the route
    let k = 1;
    while (k < this.lens.length - 1 && this.lens[k] < this.dist) k++;
    const a = this.route[k - 1], b = this.route[k];
    const seg = Math.max(1e-6, this.lens[k] - this.lens[k - 1]);
    const t = Math.min(1, Math.max(0, (this.dist - this.lens[k - 1]) / seg));
    this.pos = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    // which way are they heading on screen? x - y is screen horizontal, x + y is screen vertical
    const vx = b.x - a.x, vy = b.y - a.y;
    const sx = vx - vy, sy = vx + vy;
    const mag = Math.hypot(sx, sy) || 1;
    const now = this.scene.time.now;
    if (now - this.faceAt > 320) {
      if (Math.abs(sx) / mag > 0.3) this.setFace(sx > 0 ? 'e' : 'w');
      else if (sy > 0) this.setFace('s'); // toward the camera
      else this.setFace(this.lastSide); // away from the camera: no back view exists, so keep the side view
    }
    if (this.img.anims.currentAnim?.key !== `${this.strip}_walk`) this.img.play(`${this.strip}_walk`, true);
    this.img.anims.timeScale = Math.max(0.5, Math.min(1.3, this.speed / this.def.speed));
    this.phase += this.speed * dt * 7;
    this.place(Math.abs(Math.sin(this.phase)) * 1.3); // a little step bounce
    if (this.dist >= total) {
      this.route = [];
      this.speed = 0;
      this.pos = { x: Math.round(this.pos.x), y: Math.round(this.pos.y) };
      this.place(0);
      this.img.stop();
      this.setFace('s', true);
      this.idleFor = 1.5 + Math.random() * 5;
      this.lookAt = 1 + Math.random();
    }
  }
}
