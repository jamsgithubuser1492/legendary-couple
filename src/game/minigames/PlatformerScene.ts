import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import { emptyResult, type MGResult } from '../../state/minigames';
import { getState } from '../../state/store';
import { outfitOf } from '../../state/wardrobe';
import { FONT, MinigameScene, fitBox, H, W } from './base';
import {
  APPLES_TOTAL, BOBAS, BOXES, BRIDGE, BW, BH, CHECKPOINT_X, CRATES_TOTAL, FINISH, GROUND, GUDETAMA, GY, KILL_Y, METER_FILL, PICKUPS, PLATE_A, PLATE_B,
  PLATFORMS, SPAWN, WORLD_W, bobaX, botInput, newBody, onPlate, step, type Body,
} from './platformer/level';

/**
 * Pastel Co-op Dash, level 1: The Apple Orchard Pier. Two partners run a side scrolling pastel level together.
 *
 * Each phone simulates its own avatar (so controls never lag) and sends its position 20 times a second. The host keeps the
 * shared things: which apples and boxes are taken, the bow power up, the lever meter, the drawbridge and the finish.
 * Partner A is Hello Kitty, partner B is Miffy. In practice mode Mochi plays the other one.
 */
interface Model {
  got: Set<number>;
  opened: Set<number>;
  bonus: number; // apples from gift boxes
  bowUntil: number;
  meter: number;
  bridge: boolean;
  check: number;
  bub: Record<PlayerId, number>; // clock time the bubble started, 0 for free
  plate: Record<PlayerId, 0 | 1 | 2>;
  fin: Record<PlayerId, boolean>;
  winAt: number;
  rs: Record<PlayerId, number>; // respawn counters
  rx: number;
}
interface Pop { x: number; y: number; vy: number; text: string; life: number; color: string }
const both = <T>(v: T): Record<PlayerId, T> => ({ A: v, B: v });
const PAL = { red: 0xff3b5c, pink: 0xffb7c5, cream: 0xfffdf7, sky: 0xa2d2ff, choc: 0x7a4a3a, mint: 0xbfe8c8, gold: 0xffd36a, leaf: 0x6dbf7a };
const CAM_LERP = 6;

export class PlatformerScene extends MinigameScene {
  constructor() {
    super('PlatformerScene');
  }

  protected duration = 0;
  private m: Model = this.fresh();
  private bodies: Record<PlayerId, Body> = { A: newBody(SPAWN.A), B: newBody(SPAWN.B) };
  private shown: Record<PlayerId, { x: number; y: number }> = { A: { x: 0, y: 0 }, B: { x: 0, y: 0 } };
  private camX = 0;
  private posAcc = 0;
  private localTrap = 0;
  private lastRs: Record<PlayerId, number> = both(0);
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private touch = { left: false, right: false, jump: false };
  private world!: Phaser.GameObjects.Container;
  private far!: Phaser.GameObjects.Container;
  private mid!: Phaser.GameObjects.Container;
  private dyn!: Phaser.GameObjects.Graphics;
  private sprites!: Record<PlayerId, Phaser.GameObjects.Image | Phaser.GameObjects.Text>;
  private tags!: Record<PlayerId, Phaser.GameObjects.Text>;
  private hud!: { apples: Phaser.GameObjects.Text; crates: Phaser.GameObjects.Text; hint: Phaser.GameObjects.Text; banner: Phaser.GameObjects.Text };
  private pops: Pop[] = [];
  private boxBump = new Map<number, number>();
  private prevBridge = false;
  private bridgeT = 0;

  private fresh(): Model {
    return { got: new Set(), opened: new Set(), bonus: 0, bowUntil: 0, meter: 0, bridge: false, check: 0, bub: both(0), plate: both(0), fin: both(false), winAt: 0, rs: both(0), rx: SPAWN.A };
  }
  private other(r: PlayerId): PlayerId {
    return r === 'A' ? 'B' : 'A';
  }
  private apples() {
    let n = this.m.bonus;
    for (const p of PICKUPS) if (p.kind === 'apple' && this.m.got.has(p.id)) n++;
    return n;
  }
  private crates() {
    let n = 0;
    for (const p of PICKUPS) if (p.kind === 'crate' && this.m.got.has(p.id)) n++;
    for (const b of BOXES) if (b.kind === 'crate' && this.m.opened.has(b.id)) n++;
    return n;
  }
  private bubbled(r: PlayerId) {
    return this.m.bub[r] > 0;
  }

  // ---------------------------------------------------------------- build
  protected build() {
    this.m = this.fresh();
    this.bodies = { A: newBody(SPAWN.A), B: newBody(SPAWN.B) };
    this.shown = { A: { x: SPAWN.A, y: GY }, B: { x: SPAWN.B, y: GY } };
    this.camX = 0;
    this.posAcc = 0;
    this.localTrap = 0;
    this.lastRs = both(0);
    this.pops = [];
    this.boxBump.clear();
    this.prevBridge = false;
    this.bridgeT = 0;

    this.drawSky();
    this.far = this.add.container(0, 0).setDepth(-60);
    this.mid = this.add.container(0, 0).setDepth(-50);
    this.drawFar();
    this.drawMid();
    this.world = this.add.container(0, 0).setDepth(2);
    this.drawStatics();
    this.dyn = this.add.graphics();
    this.world.add(this.dyn);

    const sprite = (r: PlayerId) => {
      const eq = getState().wardrobe.equipped;
      const key = outfitOf(eq[r === 'A' ? 'kitty' : 'miffy'])?.sprite ?? (r === 'A' ? 'kitty_o1' : 'miffy_sweater');
      if (this.textures.exists(key)) return fitBox(this.add.image(0, 0, key).setOrigin(0.5, 1), 56, 62);
      return this.add.text(0, 0, r === 'A' ? '🎀' : '🐰', { fontSize: '44px' }).setOrigin(0.5, 1);
    };
    this.sprites = { A: sprite('A'), B: sprite('B') };
    const tag = (r: PlayerId) => this.add.text(0, 0, this.name(r), { fontFamily: FONT, fontSize: '15px', color: '#6b4f4f', backgroundColor: '#ffffffcc', padding: { x: 5, y: 1 } }).setOrigin(0.5, 1);
    this.tags = { A: tag('A'), B: tag('B') };
    this.world.add([this.sprites.A, this.sprites.B, this.tags.A, this.tags.B]);
    this.sprites.A.setData('s', this.sprites.A.scaleX);
    this.sprites.B.setData('s', this.sprites.B.scaleX);

    const st = (size: number, color = '#6b4f4f') => ({ fontFamily: FONT, fontSize: `${size}px`, color, align: 'center' as const });
    this.hud = {
      apples: this.add.text(20, 14, '', st(24)).setDepth(30),
      crates: this.add.text(20, 46, '', st(20, '#c0405a')).setDepth(30),
      hint: this.add.text(W / 2, 60, '', st(22, '#a05a7a')).setOrigin(0.5, 0).setDepth(30),
      banner: this.add.text(W / 2, 220, '', st(40, '#d9628a')).setOrigin(0.5).setDepth(40),
    };
    this.exitButton();
    if (location.search.includes('debug')) (window as unknown as { __pd: unknown }).__pd = { botInput }; // lets a test drive an avatar
    this.input.addPointer(2);
    this.keys = this.input.keyboard?.addKeys('A,D,W,SPACE,LEFT,RIGHT,UP') as Record<string, Phaser.Input.Keyboard.Key>;
    const hold = (flag: 'left' | 'right' | 'jump') => ({ onDown: () => (this.touch[flag] = true), onUp: () => (this.touch[flag] = false) });
    this.button(70, 490, 96, 64, '◀', { size: 30, ...hold('left') });
    this.button(180, 490, 96, 64, '▶', { size: 30, ...hold('right') });
    this.button(880, 490, 120, 64, 'Jump', { fill: 0xffb7c5, size: 24, ...hold('jump') });
  }

  // ---------------------------------------------------------------- art
  private drawSky() {
    const g = this.add.graphics().setDepth(-90);
    const bands = [0xffe3d6, 0xffd9d9, 0xffcfe0, 0xf6c9ea, 0xe3c8f4, 0xd2cdf6];
    bands.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillRect(-4000, -300 + i * 110, 9000, 112);
    });
    g.fillStyle(0xfff0b0, 0.9);
    g.fillCircle(740, 250, 62); // sunset sun
    g.fillStyle(0xfff6d0, 0.5);
    g.fillCircle(740, 250, 90);
  }
  private drawFar() {
    const g = this.add.graphics();
    // calm sea with a lighthouse and a few little stars
    g.fillStyle(0xcdb8ee, 1);
    g.fillRect(-100, 300, 2400, 240);
    g.fillStyle(0xf4d2e6, 0.8);
    for (let i = 0; i < 40; i++) g.fillRect(40 + i * 53, 310 + (i % 5) * 16, 28, 3);
    g.fillStyle(0xf7e9f2, 1);
    g.fillRect(1020, 190, 22, 112); // lighthouse
    g.fillStyle(PAL.red, 0.8);
    g.fillRect(1020, 214, 22, 14); g.fillRect(1020, 252, 22, 14);
    g.fillStyle(0xffe27a, 1);
    g.fillRect(1018, 176, 26, 16);
    g.fillTriangle(1012, 178, 1050, 178, 1031, 158);
    g.fillStyle(0xffffff, 0.9);
    [[200, 70], [300, 110], [380, 60], [470, 130], [1300, 80], [1400, 120], [1500, 66], [610, 90], [900, 50], [1700, 100]].forEach(([x, y]) => { g.fillCircle(x, y, 2.2); g.fillRect(x - 5, y - 0.6, 10, 1.2); g.fillRect(x - 0.6, y - 5, 1.2, 10); });
    this.far.add(g);
  }
  private drawMid() {
    const g = this.add.graphics();
    const hills = [[0, 400, 520, 0x9ed8a8], [380, 380, 640, 0x8fd09c], [900, 410, 560, 0x9ed8a8], [1380, 385, 640, 0x8fd09c], [1900, 405, 560, 0x9ed8a8], [2400, 385, 640, 0x8fd09c]];
    hills.forEach(([x, y, w, c]) => {
      g.fillStyle(c, 1);
      g.fillEllipse(x + w / 2, y + 140, w, 280);
    });
    // apple trees, a windmill with petal blades and a pink striped awning stall
    [[160, 0], [520, 1], [940, 0], [1300, 1], [1720, 0], [2100, 1], [2500, 0]].forEach(([x]) => {
      g.fillStyle(0x9a6b50, 1);
      g.fillRect(x - 6, 330, 12, 60);
      g.fillStyle(0x7cc58a, 1);
      g.fillCircle(x, 318, 38);
      g.fillStyle(PAL.red, 1);
      [[-18, 306], [14, 322], [-4, 336], [20, 300]].forEach(([dx, dy]) => g.fillCircle(x + dx, dy, 5));
    });
    g.fillStyle(0xfdf0e4, 1);
    g.fillRect(740, 318, 34, 70);
    g.fillStyle(0xf08aa8, 1);
    for (let i = 0; i < 4; i++) g.fillEllipse(757 + Math.cos(i * 1.57 + 0.5) * 30, 318 + Math.sin(i * 1.57 + 0.5) * 30, 30, 14);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 ? 0xffffff : 0xf7a8c0, 1);
      g.fillRect(1180 + i * 14, 345, 14, 12);
    }
    this.mid.add(g);
  }
  private drawStatics() {
    const g = this.add.graphics();
    // Mama Mary's bakery gate at the start
    g.fillStyle(0xfff0e0, 1);
    g.fillRoundedRect(20, 290, 190, 140, 10);
    g.fillStyle(0xf7a8c0, 1);
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 ? 0xffffff : 0xf48fb1, 1);
      g.fillRect(20 + i * 24, 276, 24, 26);
    }
    g.fillStyle(0xc48b55, 1);
    g.fillRoundedRect(92, 350, 46, 80, 8);
    g.fillStyle(0xbfe0f6, 1);
    g.fillRoundedRect(36, 322, 40, 40, 6);
    g.fillRoundedRect(156, 322, 40, 40, 6);
    this.world.add(this.add.text(115, 258, "Mama Mary's", { fontFamily: FONT, fontSize: '20px', color: '#c0405a' }).setOrigin(0.5));
    // grass and ground
    for (const s of GROUND) {
      g.fillStyle(0xc9a37e, 1);
      g.fillRect(s.x, s.y + 14, s.w, s.h);
      g.fillStyle(PAL.mint, 1);
      g.fillRoundedRect(s.x, s.y - 2, s.w, 18, 8);
      g.fillStyle(0xffffff, 1);
      for (let x = s.x + 24; x < s.x + s.w - 10; x += 70) {
        g.fillCircle(x, s.y + 2, 3.2);
        g.fillStyle(0xffd36a, 1);
        g.fillCircle(x, s.y + 2, 1.3);
        g.fillStyle(0xffffff, 1);
      }
    }
    // the wooden pier planks
    g.fillStyle(0xc48b55, 1);
    g.fillRect(2540, GY + 14, 660, 10);
    g.fillStyle(0xa8703f, 1);
    for (let x = 2540; x < 3200; x += 30) g.fillRect(x, GY + 14, 3, 10);
    // platforms: tea saucers, stacked books and wood
    for (const p of PLATFORMS) {
      if (!p.oneWay) {
        g.fillStyle(0xc48b55, 1);
        g.fillRoundedRect(p.x, p.y, p.w, p.h, 6);
        continue;
      }
      if (p.w >= 100 && p.y > 300 && p.y < 380) {
        // stacked books
        const cols = [0xf08aa8, 0x9fd3f0, 0xf6d88b];
        cols.forEach((c, i) => {
          g.fillStyle(c, 1);
          g.fillRoundedRect(p.x + i * 6, p.y + i * 7, p.w - i * 12, 8, 3);
        });
      } else {
        g.fillStyle(0xfffdf7, 1);
        g.fillEllipse(p.x + p.w / 2, p.y + 6, p.w, 16);
        g.fillStyle(0xf7a8c0, 1);
        g.fillEllipse(p.x + p.w / 2, p.y + 3, p.w - 14, 7);
      }
    }
    // Gudetama, lazy under a bacon blanket
    for (const q of GUDETAMA) {
      g.fillStyle(0xfffdf7, 1);
      g.fillEllipse(q.x + q.w / 2, q.y + 14, q.w + 4, 24);
      g.fillStyle(0xffc94a, 1);
      g.fillCircle(q.x + q.w / 2 - 6, q.y + 10, 8);
      g.fillStyle(0xe4655a, 1);
      g.fillRoundedRect(q.x + 12, q.y + 14, q.w - 8, 8, 4);
      g.fillStyle(0x7a4a3a, 1);
      g.fillCircle(q.x + q.w / 2 - 9, q.y + 9, 1.4);
      g.fillCircle(q.x + q.w / 2 - 3, q.y + 9, 1.4);
    }
    // the friendship archway of balloons, and the bell
    const ax = FINISH.x + FINISH.w / 2;
    g.fillStyle(0xc48b55, 1);
    g.fillRect(ax - 62, GY - 150, 8, 150);
    g.fillRect(ax + 54, GY - 150, 8, 150);
    const balls = [0xffb7c5, 0xa2d2ff, 0xfffdf7, 0xfff0a0, 0xbfe8c8, 0xffb7c5, 0xa2d2ff, 0xfffdf7, 0xfff0a0];
    balls.forEach((c, i) => {
      const a = Math.PI + (i / (balls.length - 1)) * Math.PI;
      g.fillStyle(c, 1);
      g.fillCircle(ax + Math.cos(a) * 62, GY - 150 + Math.sin(a) * 40, 17);
    });
    g.fillStyle(PAL.gold, 1);
    g.fillTriangle(ax - 10, GY - 120, ax + 10, GY - 120, ax, GY - 150);
    g.fillRect(ax - 10, GY - 122, 20, 3);
    // Cinnamoroll and My Melody wave from the pier
    this.cameo(g, 2640, GY - 14, 0xffffff, 0xa2d2ff);
    this.cameo(g, 2690, GY - 14, 0xffb7c5, 0xff7f9f);
    this.world.add(g);
    this.world.sendToBack(g);
  }
  private cameo(g: Phaser.GameObjects.Graphics, x: number, y: number, body: number, cheek: number) {
    g.fillStyle(body, 1);
    g.fillEllipse(x - 14, y - 40, 12, 28);
    g.fillEllipse(x + 14, y - 40, 12, 28);
    g.fillCircle(x, y - 20, 24);
    g.fillStyle(PAL.choc, 1);
    g.fillCircle(x - 8, y - 22, 2.5);
    g.fillCircle(x + 8, y - 22, 2.5);
    g.fillStyle(cheek, 0.8);
    g.fillCircle(x - 15, y - 14, 4);
    g.fillCircle(x + 15, y - 14, 4);
  }

  // ---------------------------------------------------------------- input
  private readInput() {
    const k = this.keys;
    const down = (n: string) => !!k?.[n]?.isDown;
    return {
      left: down('A') || down('LEFT') || this.touch.left,
      right: down('D') || down('RIGHT') || this.touch.right,
      jump: down('W') || down('UP') || down('SPACE') || this.touch.jump,
    };
  }

  // ---------------------------------------------------------------- the simulation of one avatar (mine, or Mochi on the host)
  private fire(role: PlayerId, k: string, v?: unknown) {
    if (this.isBot(role)) this.onInput(role, k, v);
    else this.act(role, k, v);
  }

  private simulate(role: PlayerId, dt: number, bot: boolean) {
    const b = this.bodies[role];
    const mine = this.m;
    if (this.bubbled(role)) {
      // a bubble drifts toward your partner, who pops it by touching it
      const o = this.bodies[this.other(role)];
      b.x += Math.sign(o.x - b.x) * Math.min(70 * dt, Math.abs(o.x - b.x));
      b.y += (o.y - 46 + Math.sin(this.clock * 3 + (role === 'A' ? 0 : 2)) * 6 - b.y) * Math.min(1, 0.9 * dt);
      b.vx = 0; b.vy = 0; b.ground = false;
      return;
    }
    const other = this.bodies[this.other(role)];
    const inp = bot
      ? botInput(b, { human: other, humanOnPlate: mine.plate[this.other(role)], bridge: mine.bridge, humanBubbled: this.bubbled(this.other(role)), bubble: this.bubbled(this.other(role)) ? { x: other.x, y: other.y } : null, t: this.clock })
      : this.readInput();
    const ev = step(b, inp, dt, mine.bridge);
    if (ev.jumped) this.sparkle(b.x, b.y, 3, '#ffffff');
    if (ev.bounced) this.say(b.x, b.y - 50, 'Ahhh...', '#a05a7a');
    if (ev.bumped) this.fire(role, 'box', ev.bumped.id);
    // pick things up (a wider reach while the yellow bow aura is on)
    const reach = mine.bowUntil > this.clock ? 74 : 26;
    for (const p of PICKUPS) {
      if (mine.got.has(p.id) || (p.bridge && !mine.bridge)) continue;
      if (Math.hypot(p.x - b.x, p.y - (b.y - BH / 2)) < reach) {
        if (!this.host) mine.got.add(p.id);
        this.fire(role, 'item', p.id);
      }
    }
    // my lever, and the checkpoint mug
    mine.plate[role] = onPlate(b, PLATE_A) ? 1 : onPlate(b, PLATE_B) ? 2 : 0;
    // hazards: rolling boba pearls, or falling into the sea
    const fell = b.y > KILL_Y;
    const hit = b.invuln <= 0 && BOBAS.some((p) => Math.abs(bobaX(p, this.clock) - b.x) < BW / 2 + 17 && b.y > GY - 34 && b.y <= GY + 2);
    if (fell || hit) {
      if (fell) b.y = KILL_Y - 90;
      this.say(b.x, b.y - 50, fell ? 'Splash!' : 'Boba bubble!', '#6aa6d8');
      this.localTrap = this.clock;
      mine.bub[role] = this.clock;
      this.fire(role, 'trap');
    }
  }

  // ---------------------------------------------------------------- host side
  protected onInput(from: PlayerId, k: string, v: unknown) {
    const m = this.m;
    if (k === 'pos') {
      const p = v as { x: number; y: number; vx: number; f: 1 | -1; g: boolean; gl: boolean; pl: 0 | 1 | 2 };
      const b = this.bodies[from];
      Object.assign(b, { x: p.x, y: p.y, vx: p.vx, face: p.f, ground: p.g, gliding: p.gl });
      m.plate[from] = p.pl;
    } else if (k === 'item') {
      const p = PICKUPS[v as number];
      if (p && !m.got.has(p.id)) {
        m.got.add(p.id);
        this.say(p.x, p.y - 10, p.kind === 'crate' ? '+1 🍓' : '+1', p.kind === 'crate' ? '#c0405a' : '#e0405a');
      }
    } else if (k === 'box') {
      const box = BOXES[v as number];
      if (!box || m.opened.has(box.id)) return;
      m.opened.add(box.id);
      this.boxBump.set(box.id, this.clock);
      if (box.kind === 'bow') {
        m.bowUntil = this.clock + 14;
        this.say(box.x + 20, box.y - 14, "Mimmy's bow! Sparkle aura", '#d8a000');
      } else if (box.kind === 'apples') {
        m.bonus += 3;
        this.say(box.x + 20, box.y - 14, '+3 apples', '#e0405a');
      } else this.say(box.x + 20, box.y - 14, '+1 🍓', '#c0405a');
    } else if (k === 'trap') {
      if (!this.bubbled(from)) m.bub[from] = this.clock;
    } else if (k === 'pop') {
      this.popBubble(v as PlayerId);
    }
  }

  private popBubble(r: PlayerId) {
    if (!this.bubbled(r)) return;
    this.m.bub[r] = 0;
    this.bodies[r].invuln = 1.4;
    this.bodies[r].vy = -320;
    this.sparkle(this.bodies[r].x, this.bodies[r].y - 20, 8, '#a2d2ff');
  }

  protected hostTick(dt: number) {
    const m = this.m;
    // my avatar, and Mochi
    this.stepLocal(dt);
    if (this.solo) this.simulate(this.other(this.role), dt, true);
    else this.glide(this.other(this.role), dt);
    // rescue: a free partner touching a bubble pops it, and two bubbles bumping pop each other
    for (const r of ['A', 'B'] as const) {
      const o = this.other(r);
      if (!this.bubbled(r)) continue;
      const d = Math.hypot(this.bodies[r].x - this.bodies[o].x, this.bodies[r].y - this.bodies[o].y);
      if (d < 44) {
        this.popBubble(r);
        if (this.bubbled(o)) this.popBubble(o);
      } else if (this.clock - m.bub[r] > 8) {
        this.popBubble(r); // a bubble nobody rescued pops at the checkpoint mug
        m.rs[r]++;
        m.rx = m.check ? CHECKPOINT_X : SPAWN.A;
        this.teleport(r);
      }
    }
    // the levers: hold both together to fill the heart meter and lower the drawbridge
    if (!m.bridge) {
      const pl = [m.plate.A, m.plate.B];
      const ok = (pl[0] === 1 && pl[1] === 2) || (pl[0] === 2 && pl[1] === 1);
      m.meter = ok ? Math.min(METER_FILL, m.meter + dt) : Math.max(0, m.meter - dt * 0.5);
      if (m.meter >= METER_FILL) {
        m.bridge = true;
        this.say(BRIDGE.x + 180, GY - 80, 'Bridge down! 🍓 shower', '#d9628a');
      }
    }
    if (!m.check && (this.bodies.A.x > CHECKPOINT_X || this.bodies.B.x > CHECKPOINT_X)) {
      m.check = 1;
      this.say(CHECKPOINT_X, GY - 90, 'Checkpoint! ☕', '#a05a7a');
    }
    // the finish: both inside the archway
    for (const r of ['A', 'B'] as const) {
      const b = this.bodies[r];
      m.fin[r] = b.x > FINISH.x && b.x < FINISH.x + FINISH.w && b.y >= GY - 4 && !this.bubbled(r);
    }
    if (!m.winAt && m.fin.A && m.fin.B) m.winAt = this.clock;
    if (m.winAt && this.clock - m.winAt > 3.2) this.end();
  }

  /** The partner's avatar on the host: it moves to what they last sent. */
  private glide(r: PlayerId, _dt: number) {
    void r;
  }

  private teleport(r: PlayerId) {
    const b = this.bodies[r];
    b.x = this.m.rx;
    b.y = GY;
    b.vx = 0;
    b.vy = 0;
    b.invuln = 1.5;
    this.lastRs[r] = this.m.rs[r];
  }

  /** Steps my own avatar (host or guest) and sends my position. */
  private stepLocal(dt: number) {
    this.simulate(this.role, dt, false);
    if (this.m.rs[this.role] !== this.lastRs[this.role]) this.teleport(this.role);
    this.posAcc += dt;
    if (!this.host && this.posAcc > 1 / 20) {
      this.posAcc = 0;
      const b = this.bodies[this.role];
      this.act(this.role, 'pos', { x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), f: b.face, g: b.ground, gl: b.gliding, pl: this.m.plate[this.role] });
    }
  }

  // ---------------------------------------------------------------- guest side
  protected snapshot() {
    const m = this.m;
    const pos = (r: PlayerId) => { const b = this.bodies[r]; return { x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), f: b.face, g: b.ground, gl: b.gliding }; };
    return {
      clock: this.clock,
      A: pos('A'), B: pos('B'),
      got: [...m.got], opened: [...m.opened], bonus: m.bonus, bow: m.bowUntil, meter: m.meter, bridge: m.bridge, check: m.check,
      bub: m.bub, plate: m.plate, fin: m.fin, win: m.winAt, rs: m.rs, rx: m.rx,
    };
  }

  protected applySnapshot(raw: unknown) {
    const s = raw as ReturnType<PlatformerScene['snapshot']>;
    const m = this.m;
    m.got = new Set([...m.got, ...s.got]); // never un-take something I picked up myself
    m.opened = new Set([...m.opened, ...s.opened]);
    m.bonus = s.bonus; m.bowUntil = s.bow; m.meter = s.meter; m.bridge = s.bridge; m.check = s.check;
    m.fin = s.fin; m.winAt = s.win; m.rs = s.rs; m.rx = s.rx;
    const me = this.role, o = this.other(me);
    m.plate[o] = s.plate[o];
    m.bub[o] = s.bub[o];
    if (this.clock - this.localTrap > 0.5) m.bub[me] = s.bub[me]; // my own fresh splash is not undone by an older snapshot
    // the host's avatar is theirs: I draw it where they say it is
    const p = s[o];
    Object.assign(this.bodies[o], { x: p.x, y: p.y, vx: p.vx, face: p.f, ground: p.g, gliding: p.gl });
    if (this.bubbled(me) === false && this.bodies[me].invuln <= 0 && this.wasBubbled) {
      this.bodies[me].invuln = 1.4;
      this.bodies[me].vy = -320;
    }
    this.wasBubbled = this.bubbled(me);
  }
  private wasBubbled = false;

  protected predict() {}

  // ---------------------------------------------------------------- effects
  private say(x: number, y: number, text: string, color: string) {
    this.pops.push({ x, y, vy: -34, text, life: 1.3, color });
  }
  private sparkle(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) this.pops.push({ x: x + (Math.random() - 0.5) * 24, y: y - Math.random() * 30, vy: -20 - Math.random() * 30, text: '✦', life: 0.6 + Math.random() * 0.4, color });
  }

  // ---------------------------------------------------------------- drawing
  protected draw(dt: number) {
    const m = this.m;
    // my avatar is simulated here every frame; the host also simulates for the guest only through messages
    if (!this.host) this.stepLocal(dt);
    // the other avatar glides toward where it was last reported
    const o = this.other(this.role);
    for (const r of ['A', 'B'] as const) {
      const b = this.bodies[r];
      const sh = this.shown[r];
      const follow = r === this.role || this.isBot(r);
      if (follow) { sh.x = b.x; sh.y = b.y; }
      else { sh.x += (b.x - sh.x) * Math.min(1, dt * 16); sh.y += (b.y - sh.y) * Math.min(1, dt * 16); }
    }
    void o;

    // camera: keep my avatar comfortably inside, leaning toward the partner
    const me = this.shown[this.role], pt = this.shown[this.other(this.role)];
    let target = (me.x * 2 + pt.x) / 3 - W / 2;
    target = Math.max(me.x - (W - 200), Math.min(me.x - 200, target));
    target = Math.max(0, Math.min(WORLD_W - W, target));
    this.camX += (target - this.camX) * Math.min(1, dt * CAM_LERP);
    const cx = Math.round(this.camX);
    this.world.x = -cx;
    this.far.x = -cx * 0.12;
    this.mid.x = -cx * 0.45;

    // announce the changes everyone should notice
    if (m.bridge && !this.prevBridge) this.bridgeT = this.clock;
    this.prevBridge = m.bridge;
    const bow = m.bowUntil > this.clock;

    const g = this.dyn;
    g.clear();
    this.drawWater(g);
    this.drawBridge(g);
    this.drawPlates(g);
    this.drawPickups(g, bow);
    this.drawBoxes(g);
    this.drawBobas(g);
    this.drawMug(g);
    this.drawAvatars(g, dt, bow);
    this.drawPops(g, dt);
    this.drawHud();
  }

  private drawWater(g: Phaser.GameObjects.Graphics) {
    const gaps: [number, number][] = [[620, 780], [1240, 1440], [2160, 2520]];
    gaps.forEach(([a, b]) => {
      g.fillStyle(0x9fc6f2, 1);
      g.fillRect(a, GY + 20, b - a, 140);
      g.fillStyle(0xe4f1ff, 0.9);
      for (let x = a; x < b; x += 36) g.fillEllipse(x + 18 + Math.sin(this.clock * 2 + x) * 6, GY + 22, 30, 8);
    });
  }
  private drawBridge(g: Phaser.GameObjects.Graphics) {
    const up = this.m.bridge ? Math.max(0, 1 - (this.clock - this.bridgeT) / 0.9) : 1; // 1 = raised, 0 = down
    const x = BRIDGE.x, len = BRIDGE.w;
    if (up > 0.02) {
      // the raised drawbridge stands up on the left bank
      const a = (1 - up) * 0 + up * (Math.PI / 2);
      const ex = x + Math.cos(a) * len * 0.34, ey = GY - Math.sin(a) * len * 0.34;
      g.lineStyle(10, 0xc48b55, 1);
      g.lineBetween(x, GY + 2, ex, ey);
    }
    if (up < 0.98) {
      const l = len * (1 - up);
      g.fillStyle(0xc48b55, 1);
      g.fillRect(x, GY, l, 14);
      g.fillStyle(0xa8703f, 1);
      for (let px = x; px < x + l; px += 24) g.fillRect(px, GY, 3, 14);
      g.fillStyle(0xf7a8c0, 1);
      for (let px = x + 12; px < x + l; px += 60) g.fillCircle(px, GY - 4, 4);
    }
  }
  private bow(g: Phaser.GameObjects.Graphics, x: number, y: number, c: number, s = 1) {
    g.fillStyle(c, 1);
    g.fillTriangle(x, y, x - 14 * s, y - 8 * s, x - 14 * s, y + 8 * s);
    g.fillTriangle(x, y, x + 14 * s, y - 8 * s, x + 14 * s, y + 8 * s);
    g.fillCircle(x, y, 4 * s);
  }
  private drawPlates(g: Phaser.GameObjects.Graphics) {
    const m = this.m;
    const pl = (p: typeof PLATE_A, c: number, id: 1 | 2) => {
      const on = m.plate.A === id || m.plate.B === id;
      g.fillStyle(0x7a4a3a, 1);
      g.fillRoundedRect(p.x, p.y + (on ? 6 : 0), p.w, p.h - (on ? 6 : 0), 4);
      g.fillStyle(c, on ? 1 : 0.8);
      g.fillRoundedRect(p.x + 4, p.y - 2 + (on ? 6 : 0), p.w - 8, 6, 3);
      this.bow(g, p.x + p.w / 2, p.y - 12 + (on ? 6 : 0), c, on ? 1.3 : 1);
    };
    pl(PLATE_A, PAL.red, 1);
    pl(PLATE_B, PAL.gold, 2);
    if (!m.bridge) {
      // the heart meter above the gap
      const x = BRIDGE.x + BRIDGE.w / 2 - 60, y = GY - 120;
      g.fillStyle(0xffffff, 0.9);
      g.fillRoundedRect(x, y, 120, 18, 9);
      g.fillStyle(0xff7fa0, 1);
      g.fillRoundedRect(x + 3, y + 3, Math.max(0, 114 * (m.meter / METER_FILL)), 12, 6);
    }
  }
  private apple(g: Phaser.GameObjects.Graphics, x: number, y: number, golden: boolean) {
    if (golden) { g.fillStyle(PAL.gold, 0.55); g.fillCircle(x, y, 12.5); }
    g.fillStyle(PAL.red, 1);
    g.fillCircle(x - 3, y + 1, 7.5); g.fillCircle(x + 3, y + 1, 7.5);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(x - 4, y - 2, 2);
    g.fillStyle(0x7a4a3a, 1);
    g.fillRect(x - 1, y - 11, 2, 5);
    g.fillStyle(PAL.leaf, 1);
    g.fillEllipse(x + 5, y - 9, 8, 4);
  }
  private crate(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0xc48b55, 1);
    g.fillRoundedRect(x - 14, y - 11, 28, 22, 4);
    g.fillStyle(PAL.red, 1);
    [[-7, -4], [3, -5], [-2, 2], [8, 1]].forEach(([dx, dy]) => g.fillCircle(x + dx, y + dy, 4.5));
    g.fillStyle(PAL.leaf, 1);
    [[-7, -8], [3, -9], [8, -3]].forEach(([dx, dy]) => g.fillCircle(x + dx, y + dy, 2));
  }
  private drawPickups(g: Phaser.GameObjects.Graphics, bow: boolean) {
    const m = this.m;
    for (const p of PICKUPS) {
      if (m.got.has(p.id) || (p.bridge && !m.bridge)) continue;
      const bob = Math.sin(this.clock * 3 + p.id) * 2.5;
      if (p.kind === 'crate') this.crate(g, p.x, p.y + bob);
      else this.apple(g, p.x, p.y + bob, bow);
    }
  }
  private drawBoxes(g: Phaser.GameObjects.Graphics) {
    for (const b of BOXES) {
      const open = this.m.opened.has(b.id);
      const t = this.boxBump.get(b.id);
      const dy = t !== undefined ? -Math.max(0, 8 * Math.sin(Math.min(1, (this.clock - t) * 5) * Math.PI)) : 0;
      const x = b.x, y = b.y + dy;
      g.fillStyle(open ? 0xd9c6b8 : 0xffc0d4, 1);
      g.fillRoundedRect(x, y, b.w, b.h, 7);
      g.fillStyle(open ? 0xcdb8a8 : 0xfffdf7, 1);
      g.fillRect(x + b.w / 2 - 4, y, 8, b.h);
      g.fillRect(x, y + b.h / 2 - 4, b.w, 8);
      if (!open) this.bow(g, x + b.w / 2, y - 3, 0xff7fa0, 0.9);
      else { g.fillStyle(0x7a4a3a, 0.7); g.fillRoundedRect(x - 2, y - 6, b.w + 4, 8, 3); }
    }
  }
  private drawBobas(g: Phaser.GameObjects.Graphics) {
    for (const b of BOBAS) {
      const x = bobaX(b, this.clock);
      g.fillStyle(0xd9c3ff, 0.55);
      g.fillCircle(x, GY - b.r, b.r);
      g.lineStyle(2, 0xb59be8, 0.9);
      g.strokeCircle(x, GY - b.r, b.r);
      g.fillStyle(0x6b4a5a, 1);
      g.fillCircle(x - 3, GY - b.r + 2, 5);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(x - 6, GY - b.r - 7, 3);
    }
  }
  private drawMug(g: Phaser.GameObjects.Graphics) {
    const x = CHECKPOINT_X, y = GY;
    g.fillStyle(0xfffdf7, 1);
    g.fillRoundedRect(x - 12, y - 28, 24, 26, 6);
    g.lineStyle(3, 0xfffdf7, 1);
    g.strokeCircle(x + 14, y - 16, 6);
    g.fillStyle(this.m.check ? 0x9fd9a0 : 0xe8c9a0, 1);
    g.fillRect(x - 10, y - 26, 20, 5);
    if (this.m.check) {
      g.fillStyle(0xffffff, 0.8);
      for (let i = 0; i < 3; i++) g.fillCircle(x - 5 + i * 5 + Math.sin(this.clock * 2 + i) * 2, y - 36 - ((this.clock * 20 + i * 8) % 22), 3);
    }
  }
  private drawAvatars(g: Phaser.GameObjects.Graphics, dt: number, bow: boolean) {
    void dt;
    (['A', 'B'] as const).forEach((r) => {
      const b = this.bodies[r];
      const sh = this.shown[r];
      const im = this.sprites[r];
      const base = (im.getData('s') as number) ?? 1;
      const moving = Math.abs(b.vx) > 20 && b.ground;
      const bob = moving ? Math.abs(Math.sin(this.clock * 16)) * 3 : 0;
      const bub = this.bubbled(r);
      const squash = !b.ground && !bub ? (b.vy < 0 ? 1.08 : 0.96) : 1;
      im.setPosition(sh.x, sh.y - bob + (bub ? -4 : 0));
      im.setScale((b.face === -1 ? -base : base) * (2 - squash), base * squash);
      im.setRotation(bub ? 0 : b.gliding ? Math.sin(this.clock * 30) * 0.07 : moving ? (b.vx > 0 ? 0.07 : -0.07) * Math.sin(this.clock * 16) : 0);
      im.setAlpha(b.invuln > 0 && Math.floor(this.clock * 14) % 2 ? 0.55 : 1);
      this.tags[r].setPosition(sh.x, sh.y - 64);
      if (bub) {
        g.fillStyle(0xcfe8ff, 0.35);
        g.fillCircle(sh.x, sh.y - 26, 40);
        g.lineStyle(3, 0xffffff, 0.9);
        g.strokeCircle(sh.x, sh.y - 26, 40);
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(sh.x - 18, sh.y - 46, 5);
      }
      if (b.gliding) {
        g.fillStyle(PAL.red, 0.9);
        this.bow(g, sh.x + (b.face === -1 ? 14 : -14), sh.y - 56, PAL.red, 1.2);
      }
      if (bow) {
        g.fillStyle(PAL.gold, 0.18);
        g.fillCircle(sh.x, sh.y - 24, 70);
      }
    });
  }
  private drawPops(g: Phaser.GameObjects.Graphics, dt: number) {
    void g;
    // pops are tiny text objects, kept in a pool so nothing is created every frame
    this.pops = this.pops.filter((p) => (p.life -= dt) > 0);
    for (const p of this.pops) p.y += p.vy * dt;
    this.renderPops();
  }
  private popTexts: Phaser.GameObjects.Text[] = [];
  private renderPops() {
    while (this.popTexts.length < this.pops.length) {
      const t = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '20px', color: '#e0405a', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5);
      this.world.add(t);
      this.popTexts.push(t);
    }
    this.popTexts.forEach((t, i) => {
      const p = this.pops[i];
      if (!p) return t.setVisible(false);
      t.setVisible(true).setText(p.text).setPosition(p.x, p.y).setColor(p.color).setAlpha(Math.min(1, p.life * 2));
    });
  }

  private drawHud() {
    const m = this.m;
    this.hud.apples.setText(`🍎 ${this.apples()} / ${APPLES_TOTAL}`);
    this.hud.crates.setText(`🍓 ${this.crates()} / ${CRATES_TOTAL}`);
    const me = this.bodies[this.role];
    let hint = '';
    if (this.bubbled(this.role)) hint = 'You are in a bubble. Your partner can pop you by touching it';
    else if (this.bubbled(this.other(this.role))) hint = 'Your partner is in a bubble. Fly to it and touch it to pop it';
    else if (me.x < 700) hint = 'Hold Jump in the air to bow glide. Collect the apples';
    else if (me.x > 1000 && me.x < 1120) hint = 'Jump up and bump the gift box';
    else if (me.x > 1560 && me.x < 1700) hint = 'Gudetama is a lazy trampoline';
    else if (me.x > 1700 && me.x < 2000) hint = 'Jump over the rolling boba pearls';
    else if (me.x > 1950 && !m.bridge) hint = `${this.name('A')} stands on the red bow, ${this.name('B')} on the yellow bow. Hold both`;
    else if (m.bridge && me.x < 2540) hint = 'The bridge is down. Run to the pier';
    else if (me.x > 2800) hint = 'Both of you into the friendship archway';
    this.hud.hint.setText(hint);
    this.hud.banner.setText(m.winAt ? 'Friendship Archway! 🔔' : '');
  }

  // ---------------------------------------------------------------- result
  protected result(): MGResult {
    const r = emptyResult('PASTEL_DASH');
    const apples = this.apples(), crates = this.crates();
    const won = !!this.m.winAt;
    r.score = apples * 10 + crates * 50 + (won ? 200 : 0);
    r.coins = apples + (won ? 40 : 0); // the economy caps a game at 120 coins
    r.shells = crates;
    r.eventTokens = won && crates === CRATES_TOTAL ? 1 : 0;
    r.stars = !won ? 0 : apples >= APPLES_TOTAL * 0.9 && crates === CRATES_TOTAL ? 3 : apples >= APPLES_TOTAL * 0.6 ? 2 : 1;
    r.notes = [`Apples harvested ${apples} / ${APPLES_TOTAL}`, `Strawberry crates ${crates} / ${CRATES_TOTAL}`, won ? 'Co op synergy bonus: +40 coins' : ''].filter(Boolean);
    return r;
  }
}
void H;
