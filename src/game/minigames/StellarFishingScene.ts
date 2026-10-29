import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import { FAUNA, emptyResult, type MGResult } from '../../state/minigames';
import { BUS, gameBus } from '../events';
import { getState } from '../../state/store';
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
const SURFACE_Y = 295; // where the painted water surface sits, so casts and fish stay in the water
const NIGHT_Y = -153; // top of the full night scene
const PIER_TOP = 96; // where the painted pier backdrop starts
const FISH = ['guppy', 'tang', 'bunny', 'bass', 'salmon', 'carp', 'angel', 'nudi', 'crab', 'perch', 'grouper', 'eel'];
/** The painted key for a species: the first four are older art, the rest come from the fish species sheet. */
const fishKey = (sp: string) => (['guppy', 'tang', 'bunny', 'bass'].includes(sp) ? `mg_fish_${sp}` : `sf_${sp}`);
/** Which way each painted fish faces as drawn, so the other direction can be a mirror. */
const NATIVE: Record<string, 'e' | 'w'> = { guppy: 'e', tang: 'w', bunny: 'w', bass: 'e', salmon: 'e', carp: 'e', angel: 'e', nudi: 'e', crab: 'e', perch: 'e', grouper: 'e', eel: 'w' };
/** Swim frames from the animation sheet. Only the species whose frames match their finished sprite are listed. */
const SWIM_FRAMES: Record<string, number> = { salmon: 3, nudi: 3, carp: 2, crab: 2 };
const SWIM_ORDER: Record<number, number[]> = { 2: [1, 2], 3: [1, 2, 3, 2] };
/** The rod upgrade path: the rod rests on the dock, and the best score you two have reached decides which one. */
const RODS = [
  { key: 'sf2_rod_bamboo', name: 'Bamboo Rod', from: 0 },
  { key: 'sf2_rod_carbon', name: 'Carbon Pro', from: 150 },
  { key: 'sf2_rod_stardust', name: 'Stardust Rod', from: 400 },
];
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
  private bgImg?: Phaser.GameObjects.Image;
  private bobbers = new Map<string, Phaser.GameObjects.Image>();
  private casters = new Map<PlayerId, Phaser.GameObjects.Image>();
  private rodImgs = new Map<PlayerId, Phaser.GameObjects.Image>();
  private rodTags = new Map<PlayerId, Phaser.GameObjects.Text>();
  private rodTier = 0;
  private fx: Phaser.GameObjects.Image[] = []; // pooled ring, spray and splash images
  private lastCatches = 0;
  private lastCast: Partial<Record<PlayerId, { x: number; y: number; t: number }>> = {};
  private sparkles: Phaser.GameObjects.Image[] = [];
  private ringImgs = new Map<PlayerId, Phaser.GameObjects.Image>();
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
  private tutClose: (() => void) | null = null;
  private tutNext: (() => void) | null = null; // Space or Enter moves the how to play card on
  private aim = { x: 480, y: 380 }; // where the keyboard will cast
  private aimShown = false;
  private heldKeys = { A: false, B: false };
  private arrows?: Record<'LEFT' | 'RIGHT' | 'UP' | 'DOWN', Phaser.Input.Keyboard.Key>;
  private started = false;

  private fresh(): Model {
    return { fish: [], casts: {}, ring: null, tension: null, meter: 0, shells: 0, driftwood: 0, fauna: {}, catches: 0, perfects: 0, flash: null, bottleFor: null };
  }

  protected build() {
    this.m = this.fresh();
    this.fishImgs.clear();
    this.skyImg = undefined;
    this.bgImg = undefined;
    this.bobbers.clear();
    this.casters.clear();
    this.rodImgs.clear();
    this.rodTags.clear();
    this.rodTier = 0;
    this.fx = [];
    this.lastCatches = 0;
    this.lastCast = {};
    this.sparkles = [];
    this.ringImgs.clear();
    this.nextFish = 0.3;
    this.nextId = 1;
    this.nextBottle = 25;
    this.botCast = null;
    this.bottleSeen = 0;
    this.gotSnap = false;
    this.lastBtn = '';
    this.started = false;
    this.tutorial = null;
    this.tutNext = null;
    this.tutClose = null;
    this.aimShown = false;
    this.heldKeys = { A: false, B: false };
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
    this.setupKeys();
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.aim = { x: Phaser.Math.Clamp(p.worldX, 20, W - 20), y: Phaser.Math.Clamp(p.worldY, SURFACE_Y + 4, 470) };
      this.aimShown = false; // the mouse is aiming again
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const me = this.role, m = this.m;
      if (this.tutorial || m.tension) return;
      if (m.ring) {
        if (m.ring.taps[me] === undefined) this.act(me, 'tap', this.clock - m.ring.t0); // timed on my own screen
        return;
      }
      if (p.worldY > SURFACE_Y && p.worldY < 470 && p.worldX > 20 && p.worldX < W - 20) this.act(me, 'cast', { x: p.worldX, y: p.worldY });
    });
  }

  /** Esc closes the how to play card first, and only then asks about leaving. */
  protected onEscape() {
    if (this.tutorial) return this.tutClose?.();
    super.onEscape();
  }

  // ---------- keyboard: arrows aim or pull, Space casts and taps ----------
  private setupKeys() {
    this.arrows = this.input.keyboard?.addKeys('LEFT,RIGHT,UP,DOWN') as typeof this.arrows;
    const hold = (role: PlayerId, on: boolean) => {
      if (!this.can(role) || this.heldKeys[role] === on) return;
      if (on && !this.m.tension) return;
      this.heldKeys[role] = on;
      this.act(role, 'hold', on); // the same input as the on screen hold buttons
    };
    this.onKey('ArrowLeft', () => hold('A', true), () => hold('A', false));
    this.onKey('ArrowRight', () => hold('B', true), () => hold('B', false));
    this.onKey([' ', 'Enter'], () => {
      const me = this.role, m = this.m;
      if (this.tutorial) return this.tutNext?.();
      if (m.tension) return;
      if (m.ring) {
        if (m.ring.taps[me] === undefined) this.act(me, 'tap', this.clock - m.ring.t0); // timed on my own screen
        return;
      }
      this.aimShown = false;
      this.act(me, 'cast', { x: this.aim.x, y: this.aim.y });
    });
  }

  /** Moves the keyboard aim and draws its small ring on the water. */
  private drawAim(dt: number) {
    const m = this.m;
    const a = this.arrows;
    if (!a || this.tutorial || m.tension || m.ring) return;
    const dx = (a.RIGHT.isDown ? 1 : 0) - (a.LEFT.isDown ? 1 : 0), dy = (a.DOWN.isDown ? 1 : 0) - (a.UP.isDown ? 1 : 0);
    if (dx || dy) {
      this.aimShown = true;
      this.aim = { x: Phaser.Math.Clamp(this.aim.x + dx * 330 * dt, 20, W - 20), y: Phaser.Math.Clamp(this.aim.y + dy * 330 * dt, SURFACE_Y + 4, 470) };
    }
    if (!this.aimShown) return;
    const c = this.clock, g = this.g;
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeCircle(this.aim.x, this.aim.y, 16 + Math.sin(c * 5) * 2);
    g.lineStyle(2, 0xffe08a, 0.9);
    g.strokeCircle(this.aim.x, this.aim.y, 5);
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
    this.tutNext = () => (this.tutStep >= steps.length - 1 ? close() : (this.tutStep++, paint()));
    this.tutClose = close;
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
      m.fish.push({ id: this.nextId++, x: left ? -30 : W + 30, y: SURFACE_Y + 40 + Math.random() * 130, vx: (left ? 1 : -1) * (30 + Math.random() * 26), kind, ph: Math.random() * 6 });
      this.nextFish = c + 1.3 + Math.random() * 1.1;
    }
    if (c >= this.nextBottle && !m.fish.some((f) => f.kind === 'bottle')) {
      m.fish.push({ id: this.nextId++, x: 120 + Math.random() * 700, y: SURFACE_Y + 40 + Math.random() * 130, vx: 8, kind: 'bottle', ph: 0 });
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
      const pt = v as { x?: unknown; y?: unknown } | undefined;
      if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number' || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return; // a malformed cast from a partner's phone is ignored
      const x = Phaser.Math.Clamp(pt.x, 20, W - 20), y = Phaser.Math.Clamp(pt.y, SURFACE_Y, 470); // always lands in the water
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
    } else if (k === 'tap' && m.ring && m.ring.taps[from] === undefined && typeof v === 'number' && Number.isFinite(v)) {
      m.ring.taps[from] = v;
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
  private gotSnap = false;
  protected applySnapshot(s: unknown) {
    const sm = (s as { m?: Partial<Model> } | null)?.m;
    if (!sm || typeof sm !== 'object') return; // a damaged snapshot keeps the last good picture
    this.m = { ...this.fresh(), ...sm, fish: Array.isArray(sm.fish) ? sm.fish : [], casts: sm.casts ?? {}, fauna: sm.fauna ?? {} };
    if (!this.gotSnap) {
      this.gotSnap = true;
      this.bottleSeen = this.m.bottleFor?.at ?? 0; // joining late must not reopen a note that was written before you arrived
    }
  }

  /** The painted night pier, carried past its edges on wide or tall windows. */
  private nightBackdrop(key: string) {
    const im = this.add.image(480, NIGHT_Y, key).setOrigin(0.5, 0).setDepth(-80);
    this.extendBackdrop(key, im.x - im.displayWidth / 2, NIGHT_Y, im.displayWidth, im.displayHeight, -81);
    return im;
  }

  /** The swim frame for a species at this moment, or null when the species has no matching frames. */
  private swimKey(sp: string, c: number, ph: number): string | null {
    const n = SWIM_FRAMES[sp];
    if (!n || !this.textures.exists(`sf2_${sp}_1`)) return null;
    const order = SWIM_ORDER[n] ?? [1];
    const i = order[Math.floor(Math.max(0, c * 5 + ph * 2)) % order.length];
    const key = `sf2_${sp}_${i}`;
    return this.textures.exists(key) ? key : `sf2_${sp}_1`;
  }

  /** The rod tier for the couple: the best Stellar Fishing score so far, or this session's score if it is higher. */
  private tierNow(): number {
    let best = 0;
    try {
      const b = getState().mgBest?.STELLAR_FISHING;
      if (typeof b === 'number' && Number.isFinite(b)) best = b;
    } catch { /* no saved game yet: start with the bamboo rod */ }
    const now = (this.m.catches || 0) * 10 + (this.m.perfects || 0) * 5;
    const score = Math.max(best, now);
    let tier = 0;
    RODS.forEach((r, i) => { if (score >= r.from && this.textures.exists(r.key)) tier = i; });
    return tier;
  }

  /** Each partner's rod rests on the dock beside them, and the line and bobber glow a little more as the rod improves. */
  private drawRods(c: number) {
    const tier = this.tierNow();
    this.rodTier = tier;
    for (const r of ['A', 'B'] as PlayerId[]) {
      const rod = RODS[tier];
      if (!this.textures.exists(rod.key)) continue;
      let im = this.rodImgs.get(r);
      const x = r === 'A' ? PIER_X.A - 100 : PIER_X.B + 100;
      if (!im) {
        im = this.add.image(x, 224, rod.key).setDepth(2.5).setOrigin(0.5, 0.5);
        this.rodImgs.set(r, im);
      } else if (im.texture.key !== rod.key) im.setTexture(rod.key);
      im.setScale(84 / im.width).setPosition(x, 224).setFlipX(r === 'B').setAngle(r === 'A' ? -7 : 7);
      let tag = this.rodTags.get(r);
      if (!tag) {
        tag = this.add.text(x, 240, '', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '12px', color: '#ffffff', stroke: '#2b5878', strokeThickness: 3 }).setOrigin(0.5).setDepth(2.5);
        this.rodTags.set(r, tag);
      }
      tag.setText(rod.name).setPosition(x, 240);
    }
    void c;
  }

  /** A pooled image that plays through some frames once: the spray when a line lands, the splash when something is caught. */
  private playFx(frames: string[], x: number, y: number, dur: number, scale: number) {
    const keys = frames.filter((k) => this.textures.exists(k));
    if (!keys.length) return;
    let im = this.fx.find((f) => !f.visible);
    if (!im) {
      if (this.fx.length >= 12) return;
      im = this.add.image(0, 0, keys[0]).setDepth(5);
      this.fx.push(im);
    }
    im.setData('frames', keys).setData('t0', this.clock).setData('dur', dur).setData('s', scale);
    im.setTexture(keys[0]).setPosition(x, y).setVisible(true);
  }

  private stepFx(c: number) {
    for (const im of this.fx) {
      if (!im.visible) continue;
      const frames = im.getData('frames') as string[], dur = im.getData('dur') as number, t0 = im.getData('t0') as number;
      const age = (c - t0) / dur;
      if (age >= 1) { im.setVisible(false); continue; }
      const a = Math.max(0, age);
      const key = frames[Math.min(frames.length - 1, Math.floor(a * frames.length))];
      if (im.texture.key !== key) im.setTexture(key);
      const sc = (im.getData('s') as number) * (0.6 + 0.5 * a);
      im.setScale(sc * 0.5).setAlpha(1 - a * 0.7);
    }
  }

  /** A bobber or splash image kept per player, with the bite frame swapped in while something is on the line. */
  private bobberImg(id: string, kind: string, bite: boolean) {
    const key = kind === 'splash' ? 'sf_splash' : `sf_bobber_${kind}${bite ? '_bite' : ''}`;
    if (!this.textures.exists(key)) return null;
    let im = this.bobbers.get(id);
    if (!im) {
      im = this.add.image(0, 0, key).setDepth(kind === 'splash' ? 5 : 4);
      if (kind !== 'splash') im.setScale(0.5);
      this.bobbers.set(id, im);
    } else if (im.texture.key !== key) im.setTexture(key);
    return im;
  }

  // ---------- drawing ----------
  protected draw(dt = 1 / 60) {
    const m = this.m, c = this.clock, g = this.g, me = this.role;
    g.clear();
    // painted sky for the time of day, drawn once as an image behind the water
    if (!this.skyImg) {
      const h = new Date().getHours();
      const key = h >= 20 || h < 6 ? 'mg_sky_night' : h >= 17 ? 'mg_sky_golden' : 'mg_sky_day';
      if (this.textures.exists(key)) this.skyImg = coverBox(this.add.image(480, -4, key).setOrigin(0.5, 0).setDepth(-90), 1080, 330);
    }
    // the painted pier cross section for the time of day (pier on top, water and seabed below)
    if (!this.bgImg) {
      // the painted night pier is the backdrop at every hour; the older day and golden hour pier art is the fallback
      const night = this.textures.exists('sf_bg_night');
      const h = new Date().getHours();
      const key = night ? 'sf_bg_night' : h >= 17 ? 'sf_bg_golden' : 'sf_bg_day';
      if (this.textures.exists(key)) {
        // the night scene is a whole painted picture: its planks sit at 358 and its water line at 451 when drawn 960 wide, so lift it to put them at the game's pier and surface
        if (key === 'sf_bg_night') {
          // screens that are not 16 by 9 show the margins: sky colour above and beside the pier, water colour below
          this.add.rectangle(480, -1000, 9000, 2596, 0x2a2766).setDepth(-86);
          this.add.rectangle(480, 1798, 9000, 3000, 0x1b6f7e).setDepth(-86);
        }
        this.bgImg = key === 'sf_bg_night' ? this.nightBackdrop(key) : coverBox(this.add.image(480, PIER_TOP, key).setOrigin(0.5, 0).setDepth(-80), 960, H - PIER_TOP);
      }
    }
    if (!this.skyImg) {
      const bands = [0xf9c5d6, 0xfbd0d0, 0xfcdcc8, 0xfde8c4, 0xfff0d0];
      bands.forEach((col, i) => {
        g.fillStyle(col, 1);
        g.fillRect(-2000, i * 36 - 10, 5000, 40);
      });
    }
    if (!this.bgImg) {
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
          key = f.kind === 'coop' && this.textures.exists(`mg_fish_${sp}_glow`) ? `mg_fish_${sp}_glow` : this.swimKey(sp, c, f.ph) ?? fishKey(sp);
        }
        if (!this.textures.exists(key)) key = f.kind === 'normal' || f.kind === 'coop' ? 'mg_fish_guppy' : key; // missing art falls back to the first fish
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
        const faces = NATIVE[sp] ?? 'e';
        const mult = f.kind === 'coop' ? 0.95 : 0.8;
        const swim = this.swimKey(sp, c, f.ph);
        if (swim && im.texture.key.startsWith('sf2_') && im.texture.key !== swim) im.setTexture(swim);
        const frames = im.texture.key.startsWith('sf2_');
        // a swim frame is drawn on a slightly larger canvas than the finished sprite, so scale by the fish itself
        const k = frames ? (0.5 * (this.textures.get(fishKey(sp)).getSourceImage().width as number)) / Math.max(1, im.width - 14) : im.texture.key.startsWith('sf_') ? 0.5 : 1;
        im.setScale(mult * k).setFlipX((f.vx >= 0 ? 'e' : 'w') !== faces);
        im.setAngle((Math.sin(c * 3.2 + f.ph) * 2.5) * (im.flipX ? -1 : 1)); // a gentle tail sway
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
    // James and Rachel sit on the dock: the start pose while waiting, the release frame as the line goes out
    for (const r of ['A', 'B'] as PlayerId[]) {
      const who = r === 'A' ? 'james' : 'rachel';
      const rest = `sf_fin_${who}_init_${r === 'A' ? 3 : 2}`, rel = `sf_fin_${who}_rel_2`;
      if (!this.textures.exists(rest) || !this.textures.exists(rel)) continue;
      const cs = m.casts[r];
      const key = cs && c - cs.t >= 0 && c - cs.t < 0.7 ? rel : rest;
      let im = this.casters.get(r);
      if (!im) {
        im = this.add.image(PIER_X[r], 240, rest).setOrigin(0.5, 1).setDepth(2);
        im.setData('k', 84 / im.height); // one scale for both frames so the figure does not jump in size
        this.casters.set(r, im);
      }
      if (im.texture.key !== key) im.setTexture(key);
      im.setScale(im.getData('k') as number).setPosition(PIER_X[r], 240 + Math.sin(c * 1.6 + (r === 'A' ? 0 : 2)) * 1.5);
    }
    this.drawRods(c);
    this.drawAim(dt);
    // lines and bobbers
    for (const r of ['A', 'B'] as PlayerId[]) {
      const cs = m.casts[r];
      const px = PIER_X[r];
      if (!cs) continue;
      const age = Math.max(0, c - cs.t);
      const tier = this.rodTier;
      if (tier >= 2) { g.lineStyle(7, 0xb9a8ff, 0.16 + 0.06 * Math.sin(c * 3)); g.beginPath(); g.moveTo(px + 38, 178); g.lineTo(cs.x, cs.y); g.strokePath(); }
      g.lineStyle(tier ? 2.5 : 2, tier === 1 ? 0xe4f8ff : tier === 2 ? 0xf0eaff : 0xffffff, 0.85);
      g.beginPath();
      g.moveTo(px + 38, 178);
      g.lineTo(cs.x, cs.y);
      g.strokePath();
      // a new cast sends up a little spray
      const seenCast = this.lastCast[r];
      if (!seenCast || seenCast.t !== cs.t) {
        this.lastCast[r] = { x: cs.x, y: cs.y, t: cs.t };
        this.playFx(['sf2_spray_1', 'sf2_spray_2', 'sf2_spray_3'], cs.x, cs.y + 2, 0.7, 1.1);
      }
      const bob = this.bobberImg(`b${r}`, r === 'A' ? 'shell' : 'glow', !!m.ring || !!m.tension);
      if (bob) bob.setPosition(cs.x, cs.y - 8 + Math.sin(c * 3) * 2).setVisible(true);
      else {
        g.fillStyle(r === 'A' ? 0xff7fa1 : 0x6ec6ff, 1);
        g.fillCircle(cs.x, cs.y + Math.sin(c * 3) * 2, 8);
      }
      // entry splash, then a ring that keeps spreading around the bobber
      const sp = this.bobberImg(`s${r}`, 'splash', false);
      if (sp) {
        const k = Math.min(1, age / 0.7);
        sp.setPosition(cs.x, cs.y + 4).setVisible(age < 0.7).setScale((0.55 + k * 0.5) * 0.5).setAlpha(1 - k);
      }
      if (this.textures.exists('sf2_ring_1')) {
        let ring = this.ringImgs.get(r);
        if (!ring) { ring = this.add.image(cs.x, cs.y, 'sf2_ring_1').setDepth(3.5); this.ringImgs.set(r, ring); }
        const ph = (age % 1.2) / 1.2;
        ring.setTexture(`sf2_ring_${1 + Math.min(3, Math.floor(ph * 4))}`).setPosition(cs.x, cs.y + 3).setScale(0.62 + ph * 0.25).setAlpha(0.85 - ph * 0.45).setVisible(true);
      } else {
        g.lineStyle(2, 0xffffff, Math.max(0, 0.7 - (age % 1) * 0.7));
        g.strokeCircle(cs.x, cs.y, 8 + (age % 1) * 26);
      }
      // the Stardust Rod: tiny stars drift down the line
      if (tier >= 2 && this.textures.exists('or_spark_2')) {
        for (let i = 0; i < 3; i++) {
          const idx = (r === 'A' ? 0 : 3) + i;
          let st = this.sparkles[idx];
          if (!st) { st = this.add.image(0, 0, 'or_spark_2').setDepth(4).setBlendMode(Phaser.BlendModes.ADD).setScale(0.28); this.sparkles[idx] = st; }
          const u = (c * 0.6 + i / 3) % 1;
          st.setPosition(px + 38 + (cs.x - px - 38) * u, 178 + (cs.y - 178) * u).setAlpha(Math.sin(u * Math.PI) * 0.8).setVisible(true);
        }
      } else for (let i = 0; i < 3; i++) this.sparkles[(r === 'A' ? 0 : 3) + i]?.setVisible(false);
    }
    for (const r of ['A', 'B'] as PlayerId[]) if (!m.casts[r]) {
      this.ringImgs.get(r)?.setVisible(false);
      for (let i = 0; i < 3; i++) this.sparkles[(r === 'A' ? 0 : 3) + i]?.setVisible(false);
    }
    // something was caught: a splash where the line was
    if (m.catches > this.lastCatches) {
      const last = (['A', 'B'] as PlayerId[]).map((r) => this.lastCast[r]).filter((q): q is { x: number; y: number; t: number } => !!q).sort((x, y) => y.t - x.t)[0];
      if (last) this.playFx(['sf2_splash_star', 'sf2_ring_1', 'sf2_ring_2', 'sf2_ring_3'], last.x, last.y, 0.9, 1.5);
    }
    this.lastCatches = m.catches;
    this.stepFx(c);
    for (const [k, im] of this.bobbers) if (!m.casts[k.slice(1) as PlayerId]) im.setVisible(false);
    // sync ring: tap together when the growing ring meets the green band
    if (m.ring) {
      const t = Math.max(0, c - m.ring.t0), { x, y } = m.ring;
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
    if (this.desktop) {
      if (m.ring) hint += m.ring.taps[me] === undefined ? '  (Space)' : '';
      else if (m.tension) hint += '  (hold the left or right arrow key)';
      else hint = 'Click the water by a fish, or aim with the arrows and press Space.';
    }
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
