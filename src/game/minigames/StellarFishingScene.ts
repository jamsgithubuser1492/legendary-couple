import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import { FAUNA, emptyResult, type MGResult } from '../../state/minigames';
import { BUS, gameBus } from '../events';
import { H, MinigameScene, W, coverBox } from './base';

type Kind = 'normal' | 'coop' | 'crate' | 'bottle';
interface Fish { id: number; x: number; y: number; vx: number; kind: Kind; ph: number }
interface Cast { x: number; y: number; t: number }
interface Ring { t0: number; fishId: number; kind: Kind; x: number; y: number; taps: { A?: number; B?: number } }
interface Tension { v: number; good: number; until: number; holdA: boolean; holdB: boolean; dir: number; dirT: number; x: number; y: number }
interface Model {
  fish: Fish[];
  casts: { A?: Cast; B?: Cast };
  ring: Ring | null;
  tension: Tension | null;
  meter: number; // the Perfect Catch Meter
  shells: number;
  driftwood: number;
  fauna: Record<string, number>;
  catches: number;
  perfects: number;
  flash: { text: string; until: number } | null;
  bottleFor: { role: PlayerId; at: number } | null;
}

const WATER_TOP = 200;
const FISH = ['guppy', 'tang', 'bunny', 'bass'];
/** Which way each painted fish faces as drawn, so the other direction can be a mirror. */
const NATIVE: Record<string, 'e' | 'w'> = { guppy: 'e', tang: 'w', bunny: 'w', bass: 'e' };
const RING_R = 130;
const GREEN_FROM = 0.74, GREEN_TO = 0.97, RING_TIME = 2.0; // a wider green band and a slower ring, so it is a shared moment, not a reflex test
const PIER_X: Record<PlayerId, number> = { A: 300, B: 660 };
const inGreen = (t: number) => t / RING_TIME >= GREEN_FROM && t / RING_TIME <= GREEN_TO;

export class StellarFishingScene extends MinigameScene {
  constructor() {
    super('StellarFishingScene');
  }
  protected duration = 0; // endless, ends when you press Finish
  private m!: Model;
  private fishImgs = new Map<number, Phaser.GameObjects.Image>();
  private skyImg?: Phaser.GameObjects.Image;
  private nextFish = 0.3;
  private nextId = 1;
  private nextBottle = 25;
  private botCast: { at: number; x: number; y: number } | null = null;
  private botTapAt = 0;
  private bottleSeen = 0;
  private t!: Record<string, Phaser.GameObjects.Text>;
  private btn: Record<string, ReturnType<MinigameScene['button']>> = {};
  private lastBtn = '';
  private tutorial: Phaser.GameObjects.Container | null = null;
  private tutStep = 0;
  private started = false;

  private fresh(): Model {
    return { fish: [], casts: {}, ring: null, tension: null, meter: 0, shells: 0, driftwood: 0, fauna: {}, catches: 0, perfects: 0, flash: null, bottleFor: null };
  }

  protected build() {
    this.m = this.fresh();
    this.fishImgs.clear();
    this.skyImg = undefined;
    this.nextFish = 0.3;
    this.nextId = 1;
    this.nextBottle = 25;
    this.botCast = null;
    this.bottleSeen = 0;
    this.lastBtn = '';
    this.started = false;
    this.tutorial = null;
    const mk = (x: number, y: number, size: number, color = '#ffffff', ox = 0.5, oy = 0.5) =>
      this.add.text(x, y, '', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: `${size}px`, color, align: 'center', stroke: '#2b5878', strokeThickness: 4, wordWrap: { width: 700 } }).setOrigin(ox, oy).setDepth(10);
    this.t = {
      loot: mk(24, 18, 24, '#ffffff', 0, 0),
      meter: mk(480, 18, 18, '#ffffff', 0.5, 0),
      hint: mk(480, 468, 18),
      names: mk(480, 170, 18),
      nameA: mk(PIER_X.A, 128, 16, '#ffd9e2'),
      nameB: mk(PIER_X.B, 128, 16, '#bfe6f2'),
      banner: mk(480, 330, 38, '#fff3a0'),
    };
    this.exitButton();
    this.button(800, 24, 44, 36, '?', { fill: 0xfff3a0, size: 20, onUp: () => this.showTutorial(true) });
    this.btn.finish = this.button(480, 518, 180, 34, 'Finish fishing', { fill: 0xe8e0f0, size: 16, onUp: () => this.act(this.role, 'finish') });
    // tension controls: A pulls the line left, B pulls it right
    this.btn.holdA = this.button(150, 380, 220, 64, '◀ Hold: pull left', { fill: 0xffd9e2, size: 20, onDown: () => this.act('A', 'hold', true), onUp: () => this.act('A', 'hold', false) });
    this.btn.holdB = this.button(810, 380, 220, 64, 'Hold: pull right ▶', { fill: 0xbfe6f2, size: 20, onDown: () => this.act('B', 'hold', true), onUp: () => this.act('B', 'hold', false) });
    this.btn.holdA.setVisible(false);
    this.btn.holdB.setVisible(false);
    let seen = false;
    try { seen = localStorage.getItem('olw:fishTutorial') === '1'; } catch { /* ignore */ }
    if (seen) {
      this.started = true;
      this.nextFish = 1.2;
      this.nextBottle = 30;
    } else this.showTutorial();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const me = this.role, m = this.m;
      if (this.tutorial || m.tension) return;
      if (m.ring) {
        if (m.ring.taps[me] === undefined) this.act(me, 'tap', this.clock - m.ring.t0); // timed on my own screen
        return;
      }
      if (p.worldY > WATER_TOP + 10 && p.worldY < 470 && p.worldX > 20 && p.worldX < W - 20) this.act(me, 'cast', { x: p.worldX, y: p.worldY });
    });
  }

  // ---------- tutorial ----------
  private static readonly STEPS: { icon: string; title: string; body: string }[] = [
    { icon: '🎣', title: 'Welcome to Stellar Fishing', body: 'A calm game for the two of you. There is no timer and nothing to rush. Fish side by side from the pier, and press Finish whenever you like.' },
    { icon: '🐟', title: 'Cast: tap the water', body: 'Tap the water right next to a fish to cast. Plain fish are yours to catch alone. A fish with a glowing halo and two little rings needs BOTH of you to cast near it.' },
    { icon: '💞', title: 'Sync ring: tap together', body: 'When a ring appears, it grows toward a green band. Both of you tap as it reaches the green. Close is a good catch, and tapping together is a perfect one.' },
    { icon: '🐙', title: 'Rare critters and bottles', body: 'Some catches pull back. The first of you holds the left button and the second holds the right to keep the marker in the green. A floating bottle holds a secret note for your partner.' },
  ];

  /** A friendly how to play card. Opens on your first visit and any time you tap the ? button. */
  private showTutorial(again = false) {
    if (this.tutorial) return;
    if (again && this.host && this.started) this.started = false; // the host pauses while the card is open
    this.tutStep = 0;
    const steps = StellarFishingScene.STEPS;
    const c = this.add.container(0, 0).setDepth(200);
    const dim = this.add.rectangle(480, 270, 960, 540, 0x2b5878, 0.55).setInteractive();
    const card = this.add.graphics();
    card.fillStyle(0xfff6ec, 1);
    card.fillRoundedRect(190, 90, 580, 340, 26);
    const icon = this.add.text(480, 150, '', { fontSize: '56px' }).setOrigin(0.5);
    const title = this.add.text(480, 215, '', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '30px', color: '#6b4f4f' }).setOrigin(0.5);
    const body = this.add.text(480, 292, '', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '19px', color: '#8a6b6b', align: 'center', wordWrap: { width: 500 } }).setOrigin(0.5, 0.5);
    const dots = this.add.graphics();
    c.add([dim, card, icon, title, body, dots]);
    const paint = () => {
      const st = steps[this.tutStep];
      icon.setText(st.icon);
      title.setText(st.title);
      body.setText(st.body);
      dots.clear();
      steps.forEach((_, i) => {
        dots.fillStyle(i === this.tutStep ? 0xff7fa1 : 0xe8d6c8, 1);
        dots.fillCircle(480 + (i - (steps.length - 1) / 2) * 22, 372, 6);
      });
      next.setLabel(this.tutStep === steps.length - 1 ? "Let's fish" : 'Next');
    };
    const close = () => {
      c.destroy(true);
      this.tutorial = null;
      try { localStorage.setItem('olw:fishTutorial', '1'); } catch { /* ignore */ }
      if (this.host && !this.started) {
        this.started = true;
        this.nextFish = this.clock + 0.8;
        this.nextBottle = this.clock + 30;
      }
    };
    const next = this.button(480, 405, 200, 46, 'Next', { fill: 0xffd9e2, size: 20, onUp: () => (this.tutStep >= steps.length - 1 ? close() : (this.tutStep++, paint())) });
    const skip = this.add.text(700, 112, 'Skip', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '16px', color: '#a08a8a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skip.on('pointerup', close);
    c.add([next.c, skip]);
    this.tutorial = c;
    paint();
  }

  // ---------- host simulation ----------
  protected hostTick(dt: number) {
    if (!this.started) {
      this.clock = Math.min(this.clock, 0.2); // nothing happens until the tutorial is closed
      return;
    }
    const m = this.m, c = this.clock;
    // fish swim in from the sides
    const busy = !!m.ring || !!m.tension;
    if (c >= this.nextFish && m.fish.length < (busy ? 4 : 7)) {
      const r = Math.random();
      const kind: Kind = r < 0.1 ? 'crate' : r < 0.45 ? 'coop' : 'normal';
      const left = Math.random() < 0.5;
      m.fish.push({ id: this.nextId++, x: left ? -30 : W + 30, y: WATER_TOP + 60 + Math.random() * 180, vx: (left ? 1 : -1) * (30 + Math.random() * 26), kind, ph: Math.random() * 6 });
      this.nextFish = c + 1.3 + Math.random() * 1.1;
    }
    if (c >= this.nextBottle && !m.fish.some((f) => f.kind === 'bottle')) {
      m.fish.push({ id: this.nextId++, x: 120 + Math.random() * 700, y: WATER_TOP + 70 + Math.random() * 160, vx: 8, kind: 'bottle', ph: 0 });
      this.nextBottle = c + 40;
    }
    for (const f of m.fish) f.x += f.vx * dt;
    m.fish = m.fish.filter((f) => f.x > -80 && f.x < W + 80);
    for (const r of ['A', 'B'] as PlayerId[]) if (m.casts[r] && c - m.casts[r]!.t > 6) delete m.casts[r];
    if (m.flash && c > m.flash.until) m.flash = null;

    // the sync ring
    if (m.ring) {
      const t = c - m.ring.t0;
      for (const r of ['A', 'B'] as PlayerId[]) if (this.isBot(r) && m.ring.taps[r] === undefined && t >= 1.55 + this.botTapAt) this.onInput(r, 'tap', 1.58 + this.botTapAt);
      if (m.ring && t > RING_TIME + 0.9) {
        m.fish = m.fish.filter((f) => f.id !== m.ring!.fishId);
        m.flash = { text: 'It got away!', until: c + 1.4 };
        m.ring = null;
      }
    }
    // the bot partner casts beside you
    if (this.botCast && c >= this.botCast.at) {
      for (const r of ['A', 'B'] as PlayerId[]) if (this.isBot(r)) this.onInput(r, 'cast', { x: this.botCast.x, y: this.botCast.y });
      this.botCast = null;
    }
    // the tension balance
    const tn = m.tension;
    if (tn) {
      tn.dirT -= dt;
      if (tn.dirT <= 0) {
        tn.dir = Math.random() < 0.5 ? -1 : 1;
        tn.dirT = 0.8 + Math.random() * 0.8;
      }
      for (const r of ['A', 'B'] as PlayerId[]) {
        if (!this.isBot(r)) continue;
        const want = r === 'A' ? tn.v > 0.56 : tn.v < 0.44; // the bot pulls back toward the middle
        if (r === 'A') tn.holdA = want;
        else tn.holdB = want;
      }
      tn.v += tn.dir * 0.22 * dt + ((tn.holdB ? 1 : 0) - (tn.holdA ? 1 : 0)) * 0.4 * dt;
      if (tn.v > 0.3 && tn.v < 0.7) tn.good += dt;
      if (tn.v <= 0.02 || tn.v >= 0.98 || c > tn.until) {
        m.flash = { text: 'The critter slipped away', until: c + 1.6 };
        m.tension = null;
      } else if (tn.good >= 2.5) {
        const f = FAUNA[Math.floor(Math.random() * FAUNA.length)];
        m.fauna[f.id] = (m.fauna[f.id] ?? 0) + 1;
        m.shells += 3;
        m.catches++;
        m.flash = { text: `${f.icon} A ${f.name}! +3 🐚`, until: c + 2.2 };
        m.tension = null;
      }
    }
  }

  protected onInput(from: PlayerId, k: string, v?: unknown) {
    const m = this.m, c = this.clock;
    if (k === 'finish') return this.end();
    if (k === 'hold' && m.tension) {
      if (from === 'A') m.tension.holdA = !!v;
      else m.tension.holdB = !!v;
    } else if (k === 'cast' && !m.ring && !m.tension) {
      const { x, y } = v as { x: number; y: number };
      m.casts[from] = { x, y, t: c };
      const near = (f: Fish, r: number) => Math.hypot(f.x - x, f.y - y) < r;
      const bottle = m.fish.find((f) => f.kind === 'bottle' && near(f, 60));
      const normal = m.fish.find((f) => f.kind === 'normal' && near(f, 50));
      if (bottle) {
        m.fish = m.fish.filter((f) => f.id !== bottle.id);
        m.shells += 1;
        m.bottleFor = { role: from, at: c };
        m.flash = { text: '🍾 A message in a bottle!', until: c + 2.5 };
      } else if (normal) {
        m.fish = m.fish.filter((f) => f.id !== normal.id);
        m.shells += 1;
        m.catches++;
        m.flash = { text: '+1 🐚', until: c + 1 };
      } else {
        const both = (f: Fish) => (['A', 'B'] as PlayerId[]).every((r) => m.casts[r] && c - m.casts[r]!.t < 4 && Math.hypot(f.x - m.casts[r]!.x, f.y - m.casts[r]!.y) < 85);
        const target = m.fish.find((f) => (f.kind === 'coop' || f.kind === 'crate') && both(f));
        if (target) {
          m.ring = { t0: c, fishId: target.id, kind: target.kind, x: target.x, y: target.y, taps: {} };
          this.botTapAt = Math.random() * 0.2;
        } else {
          // when you cast near a glowing co op target and the bot is your partner, the bot joins in
          const hint = m.fish.find((f) => (f.kind === 'coop' || f.kind === 'crate') && near(f, 85));
          if (hint && this.isBot(from === 'A' ? 'B' : 'A')) this.botCast = { at: c + 0.5, x: hint.x + (Math.random() - 0.5) * 30, y: hint.y + (Math.random() - 0.5) * 24 };
        }
      }
    } else if (k === 'tap' && m.ring && m.ring.taps[from] === undefined) {
      m.ring.taps[from] = v as number;
      const { A, B } = m.ring.taps;
      if (A === undefined || B === undefined) return;
      const perfect = inGreen(A) && inGreen(B) && Math.abs(A - B) <= 0.18;
      const good = A > 1.2 && A < 2.1 && B > 1.2 && B < 2.1 && Math.abs(A - B) <= 0.4;
      const ring = m.ring;
      m.ring = null;
      m.fish = m.fish.filter((f) => f.id !== ring.fishId);
      if (!perfect && !good) {
        m.flash = { text: 'Out of sync! It got away', until: c + 1.6 };
        return;
      }
      m.catches++;
      if (perfect) m.perfects++;
      m.meter += perfect ? 34 : 18;
      if (ring.kind === 'crate') {
        m.driftwood += perfect ? 2 : 1;
        m.shells += 1;
        m.flash = { text: `${perfect ? '✨ Perfect! ' : ''}📦 Driftwood crate +${perfect ? 2 : 1} 🪵`, until: c + 2 };
      } else {
        m.shells += perfect ? 3 : 2;
        m.flash = { text: `${perfect ? '✨ Perfect catch! ' : 'Nice catch! '}+${perfect ? 3 : 2} 🐚`, until: c + 2 };
        if (Math.random() < 0.45) m.tension = { v: 0.5, good: 0, until: c + 11, holdA: false, holdB: false, dir: 1, dirT: 0.8, x: ring.x, y: ring.y };
      }
      if (m.meter >= 100) {
        m.meter = 0;
        m.driftwood += 1;
        m.shells += 2;
        m.flash = { text: '🌟 Perfect Catch Meter full! Treasure +2 🐚 +1 🪵', until: c + 2.4 };
      }
    }
  }

  protected snapshot() {
    return { clock: this.clock, m: this.m };
  }
  protected applySnapshot(s: unknown) {
    this.m = (s as { m: Model }).m;
  }

  // ---------- drawing ----------
  protected draw() {
    const m = this.m, c = this.clock, g = this.g, me = this.role;
    g.clear();
    // painted sky for the time of day, drawn once as an image behind the water
    if (!this.skyImg) {
      const h = new Date().getHours();
      const key = h >= 20 || h < 6 ? 'mg_sky_night' : h >= 17 ? 'mg_sky_golden' : 'mg_sky_day';
      if (this.textures.exists(key)) this.skyImg = coverBox(this.add.image(480, -4, key).setOrigin(0.5, 0).setDepth(-90), 1080, 330);
    }
    if (!this.skyImg) {
      const bands = [0xf9c5d6, 0xfbd0d0, 0xfcdcc8, 0xfde8c4, 0xfff0d0];
      bands.forEach((col, i) => {
        g.fillStyle(col, 1);
        g.fillRect(-2000, i * 36 - 10, 5000, 40);
      });
    }
    // water
    g.fillStyle(0x6cc4dc, 1);
    g.fillRect(-2000, WATER_TOP - 20, 5000, 3000);
    g.fillStyle(0x7fd0e0, 1);
    g.fillRect(-2000, WATER_TOP - 20, 5000, 120);
    for (let row = 0; row < 9; row++) {
      const y = WATER_TOP + 14 + row * 34;
      g.lineStyle(2.5, 0xffffff, 0.22 + row * 0.02);
      g.beginPath();
      for (let x = 0; x <= W; x += 24) {
        const yy = y + Math.sin(x * 0.02 + c * 0.9 + row) * 4;
        if (x === 0) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.strokePath();
    }
    // pier
    g.fillStyle(0x8a6a4c, 1);
    g.fillRect(-2000, 160, 5000, 44);
    g.fillStyle(0xd9b88a, 1);
    g.fillRect(-2000, 150, 5000, 40);
    g.lineStyle(2, 0xb08c60, 0.7);
    for (let x = 0; x < W; x += 36) {
      g.beginPath();
      g.moveTo(x, 150);
      g.lineTo(x, 190);
      g.strokePath();
    }
    // fish, crates and bottles: painted sprites, with a glow variant for the co op fish
    const seen = new Set<number>();
    for (const f of m.fish) {
      const y = f.y + Math.sin(c * 2 + f.ph) * 3;
      seen.add(f.id);
      let im = this.fishImgs.get(f.id);
      if (!im) {
        let key = f.kind === 'bottle' ? 'mg_bottle' : f.kind === 'crate' ? 'mg_crate' : '';
        if (!key) {
          const sp = FISH[f.id % FISH.length];
          key = f.kind === 'coop' && this.textures.exists(`mg_fish_${sp}_glow`) ? `mg_fish_${sp}_glow` : `mg_fish_${sp}`;
        }
        if (!this.textures.exists(key)) continue;
        im = this.add.image(f.x, y, key).setDepth(3);
        this.fishImgs.set(f.id, im);
      }
      const sp = FISH[f.id % FISH.length];
      im.setPosition(f.x, y).setVisible(true).setAlpha(m.ring && m.ring.fishId !== f.id ? 0.3 : 1); // while a ring is up, the target stands out
      if (f.kind === 'bottle') {
        im.setScale(0.9).setAngle(Math.sin(c * 2 + f.ph) * 10);
        g.fillStyle(0xffffff, 0.3 + 0.2 * Math.sin(c * 4));
        g.fillCircle(f.x, y, 34);
      } else if (f.kind === 'crate') {
        im.setScale(0.85);
        g.fillStyle(0xffd23f, 0.25 + 0.2 * Math.sin(c * 4));
        g.fillCircle(f.x, y, 44);
        this.dualTarget(f.x, y - 40);
      } else {
        const faces = NATIVE[sp];
        im.setScale(f.kind === 'coop' ? 0.95 : 0.8).setFlipX((f.vx >= 0 ? 'e' : 'w') !== faces);
        if (f.kind === 'coop') {
          g.fillStyle(0x9ff3ff, 0.22 + 0.18 * Math.sin(c * 5 + f.ph));
          g.fillCircle(f.x, y, 46);
          this.dualTarget(f.x, y - 42);
        }
      }
    }
    for (const [id, im] of this.fishImgs) if (!seen.has(id)) {
      im.destroy();
      this.fishImgs.delete(id);
    }
    // lines and bobbers
    for (const r of ['A', 'B'] as PlayerId[]) {
      const cs = m.casts[r];
      const px = PIER_X[r];
      if (!cs) continue;
      const age = c - cs.t;
      g.lineStyle(2, 0xffffff, 0.8);
      g.beginPath();
      g.moveTo(px, 176);
      g.lineTo(cs.x, cs.y);
      g.strokePath();
      g.fillStyle(r === 'A' ? 0xff7fa1 : 0x6ec6ff, 1);
      g.fillCircle(cs.x, cs.y + Math.sin(c * 3) * 2, 8);
      g.lineStyle(2, 0xffffff, Math.max(0, 0.7 - (age % 1) * 0.7));
      g.strokeCircle(cs.x, cs.y, 8 + (age % 1) * 26);
    }
    // sync ring: tap together when the growing ring meets the green band
    if (m.ring) {
      const t = c - m.ring.t0, { x, y } = m.ring;
      g.lineStyle(10, 0x7ee09a, 0.9);
      g.strokeCircle(x, y, RING_R * ((GREEN_FROM + GREEN_TO) / 2));
      g.lineStyle(3, 0xffffff, 0.7);
      g.strokeCircle(x, y, RING_R);
      const r = Math.min(RING_R * 1.15, (t / RING_TIME) * RING_R);
      g.lineStyle(7, inGreen(t) ? 0xfff3a0 : 0xffffff, 1);
      g.strokeCircle(x, y, r);
      for (const pr of ['A', 'B'] as PlayerId[]) {
        const tp = m.ring.taps[pr];
        if (tp !== undefined) {
          g.fillStyle(pr === 'A' ? 0xff7fa1 : 0x6ec6ff, 1);
          g.fillCircle(x + (pr === 'A' ? -20 : 20), y, 9);
        }
      }
    }
    // tension balance
    if (m.tension) {
      const tn = m.tension;
      const bx = 180, bw = 600, by = 360;
      g.fillStyle(0x000000, 0.2);
      g.fillRoundedRect(bx, by, bw, 26, 13);
      g.fillStyle(0x7ee09a, 0.9);
      g.fillRoundedRect(bx + 0.3 * bw, by, 0.4 * bw, 26, 10);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(bx + tn.v * bw, by + 13, 17);
      g.fillStyle(0xff7fa1, 1);
      g.fillCircle(bx + tn.v * bw, by + 13, 9);
      g.fillStyle(0xffffff, 0.9);
      g.fillRoundedRect(bx, by + 36, bw * Math.min(1, tn.good / 2.5), 8, 4);
    }
    // text
    const fa = Object.entries(m.fauna).map(([k, n]) => `${FAUNA.find((f) => f.id === k)?.icon ?? ''}${n}`).join(' ');
    this.t.loot.setText(`🐚 ${m.shells}   🪵 ${m.driftwood}   ${fa}`);
    this.t.meter.setText(`Perfect Catch ${'█'.repeat(Math.floor(m.meter / 10))}${'░'.repeat(10 - Math.floor(m.meter / 10))}`);
    this.t.names.setText('');
    this.t.nameA.setText(`${this.name('A')}${me === 'A' ? ' (you)' : ''}`);
    this.t.nameB.setText(`${this.name('B')}${me === 'B' ? ' (you)' : ''}`);
    this.t.banner.setText(m.flash?.text ?? '');
    let hint = 'Tap the water next to a fish. Glowing fish need you both.';
    if (m.ring) hint = m.ring.taps[me] === undefined ? 'Tap together when the ring reaches the green' : 'Waiting for your partner to tap…';
    else if (m.tension) hint = 'Keep the marker in the green. One of you holds left, the other holds right';
    this.t.hint.setText(hint);
    g.fillStyle(0x2b5878, 0.55);
    g.fillRoundedRect(110, 446, 740, 44, 22);
    // controls
    const key = `${me}${m.tension ? 1 : 0}`;
    if (key !== this.lastBtn) {
      this.lastBtn = key;
      this.btn.holdA.setVisible(!!m.tension);
      this.btn.holdB.setVisible(!!m.tension);
      this.btn.holdA.setEnabled(this.can('A'));
      this.btn.holdB.setEnabled(this.can('B'));
    }
    // a bottle was caught: the player who caught it writes a sealed note
    if (m.bottleFor && m.bottleFor.at !== this.bottleSeen) {
      this.bottleSeen = m.bottleFor.at;
      if (m.bottleFor.role === me) gameBus.emit(BUS.mgBottle, { role: me });
    }
  }

  /** A little pair of target rings that marks a fish needing two lines. */
  private dualTarget(x: number, y: number) {
    this.g.lineStyle(2.5, 0xffffff, 0.95);
    this.g.strokeCircle(x - 9, y, 7);
    this.g.strokeCircle(x + 9, y, 7);
    this.g.fillStyle(0xffffff, 0.95);
    this.g.fillCircle(x - 9, y, 2);
    this.g.fillCircle(x + 9, y, 2);
  }

  protected result(): MGResult {
    const m = this.m;
    const r = emptyResult('STELLAR_FISHING');
    r.shells = m.shells;
    r.driftwood = m.driftwood;
    r.fauna = { ...m.fauna };
    r.score = m.catches * 10 + m.perfects * 5;
    r.notes = [`${m.catches} catches, ${m.perfects} perfect syncs`, 'Driftwood lowers the price of expanding your island'];
    return r;
  }
}
void H;
