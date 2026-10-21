import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import { emptyResult, type MGResult } from '../../state/minigames';
import { getTheme } from '../../state/season';
import { H, MinigameScene, W } from './base';

type Kind = 'apple' | 'golden' | 'berry' | 'twig';
interface Apple { id: number; x: number; y: number; vy: number; kind: Kind; bounced?: boolean }
interface Model {
  apples: Apple[];
  basketX: number;
  score: number;
  caught: number;
  goldens: number;
  twigs: number;
  showerUntil: number;
  lit: { tree: number; until: number; at: number; used?: boolean } | null;
  flash: { text: string; until: number } | null;
}

const TX = [200, 480, 760];
const GROUND = 478;
const BASKET_Y = 452;
const SWAP_AT = 35, SWAP_END = 40;
const TREE_H = 330; // painted trees stand on the ground, canopy up to the lit target
const TARGET_Y = 205;
const PERSON_H = 74;

/** Frames for each painted person; scale is picked so a person stands about PERSON_H tall. */
const SETS: Record<string, { shake: string[]; catch: string[]; win: string[]; run: { e: string; w?: string }; h: number }> = {
  james: { shake: [1, 2, 3, 4].map((n) => `or_james_pose_shake_${n}`), catch: [1, 2, 3, 4].map((n) => `or_james_pose_catch_${n}`), win: ['or_james_pose_win_1', 'or_james_pose_win_2'], run: { e: 'or_james_run_e', w: 'or_james_run_w' }, h: 63 },
  rachel: { shake: [1, 2, 3, 4].map((n) => `or_rachel_pose_shake_${n}`), catch: [1, 2, 3, 4].map((n) => `or_rachel_pose_catch_${n}`), win: ['or_rachel_pose_win_1', 'or_rachel_pose_win_2'], run: { e: 'or_rachel_run_e' }, h: 63 },
  mochi: { shake: ['or_mochi_shake_1', 'or_mochi_shake_2'], catch: ['or_mochi_catch'], win: ['or_mochi_catch', 'or_mochi_run'], run: { e: 'or_mochi_run' }, h: 80 },
};
const SEASON_OF = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter', holidays: 'winter' } as const;
const SEASON_TINT: Record<string, number> = { spring: 0xffffff, summer: 0xffffff, autumn: 0xffe6c8, winter: 0xe4ecf8 };
const GRASS: Record<string, [number, number]> = { spring: [0xcfd9b4, 0xb7e0a0], summer: [0xc7cdb2, 0xa9d68c], autumn: [0xd9cfa8, 0xc9b87a], winter: [0xdfe6ee, 0xcfdbe6] };

interface Fx { im: Phaser.GameObjects.Image; t0: number; dur: number; vx: number; vy: number; spin: number; s0: number; s1: number; a0: number; sway: number; ph: number }
interface Seen { x: number; y: number; kind: Kind; id: number }

export class OrchardScene extends MinigameScene {
  constructor() {
    super('OrchardScene');
  }

  protected duration = 75;
  private m: Model = { apples: [], basketX: 480, score: 0, caught: 0, goldens: 0, twigs: 0, showerUntil: 0, lit: null, flash: null };
  private bx = 480; // my own basket position, applied instantly (client prediction)
  private bxAcc = 0;
  private nextLit = 1;
  private nextTwig = 3;
  private nextBerry = 0;
  private nextId = 1;
  private whistled = false;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private texts!: { score: Phaser.GameObjects.Text; time: Phaser.GameObjects.Text; role: Phaser.GameObjects.Text; banner: Phaser.GameObjects.Text; names: Phaser.GameObjects.Text[] };
  private taps: { x: number; y: number; t: number; done?: boolean }[] = [];
  // painted art (all optional: the old code drawing is the fallback when a texture is missing)
  private art = false;
  private ft = 0; // real time in seconds, for effects that must not jump with host snapshots
  private season = 'summer';
  private g2!: Phaser.GameObjects.Graphics;
  private far?: Phaser.GameObjects.Image;
  private dusk?: Phaser.GameObjects.Image;
  private tint?: Phaser.GameObjects.Image;
  private trees: Phaser.GameObjects.Image[] = [];
  private basketImg?: Phaser.GameObjects.Image;
  private glowImg?: Phaser.GameObjects.Image;
  private showerImgs: Phaser.GameObjects.Image[] = [];
  private people: Phaser.GameObjects.Image[] = [];
  private shadowImgs = new Map<number, Phaser.GameObjects.Image>();
  private fruit = new Map<number, Phaser.GameObjects.Image>();
  private seen = new Map<number, Seen>();
  private fx: Fx[] = [];
  private leafAcc = 0;
  private shookAt = -1;
  private tapT = -9;
  private catchT = -9;
  private wobbleT = -9;
  private lastTree = 0;
  private streak = 0;

  private shaker(): PlayerId | null {
    return this.clock < SWAP_AT ? 'A' : this.clock >= SWAP_END ? 'B' : null;
  }
  private catcher(): PlayerId | null {
    const s = this.shaker();
    return s ? (s === 'A' ? 'B' : 'A') : null;
  }

  protected build() {
    this.m = { apples: [], basketX: 480, score: 0, caught: 0, goldens: 0, twigs: 0, showerUntil: 0, lit: null, flash: null };
    this.bx = 480;
    this.nextLit = 1;
    this.nextTwig = 3;
    this.nextBerry = 0;
    this.whistled = false;
    this.taps = [];
    const style = (size: number, color = '#6b4f4f') => ({ fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: `${size}px`, color, align: 'center' as const });
    this.texts = {
      score: this.add.text(24, 18, '', style(28)).setDepth(10),
      time: this.add.text(W / 2, 18, '', style(28)).setOrigin(0.5, 0).setDepth(10),
      role: this.add.text(W / 2, 54, '', style(20, '#a05a7a')).setOrigin(0.5, 0).setDepth(10),
      banner: this.add.text(W / 2, 250, '', style(40, '#d9628a')).setOrigin(0.5).setDepth(30),
      names: [this.add.text(0, 0, '', style(18)).setOrigin(0.5).setDepth(10), this.add.text(0, 0, '', style(18)).setOrigin(0.5).setDepth(10)],
    };
    this.exitButton();
    this.keys = this.input.keyboard?.addKeys('A,D,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.can(this.catcher() ?? 'A') && this.catcher()) this.bx = Phaser.Math.Clamp(p.worldX, 80, W - 80);
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const me = this.role;
      if (this.shaker() === me) {
        let best = -1, d = 150;
        TX.forEach((x, i) => {
          const dist = Math.abs(p.worldX - x);
          if (dist < d && p.worldY < 340) { d = dist; best = i; }
        });
        if (best >= 0) {
          this.taps.push({ x: TX[best], y: 150, t: this.clock });
          this.act(me, 'shake', best);
        }
      } else if (this.catcher() === me) this.bx = Phaser.Math.Clamp(p.worldX, 80, W - 80);
    });
    this.buildArt();
  }

  // ---------- painted art ----------
  private has(k: string) {
    return this.textures.exists(k);
  }

  private buildArt() {
    this.fx = []; this.trees = []; this.showerImgs = []; this.people = [];
    this.fruit.clear(); this.shadowImgs.clear(); this.seen.clear();
    this.leafAcc = 0; this.shookAt = -1; this.tapT = -9; this.catchT = -9; this.wobbleT = -9; this.lastTree = 0; this.streak = 0;
    this.far = this.dusk = this.tint = this.basketImg = this.glowImg = undefined;
    this.art = this.has('or_tree') && this.has('or_bg_far') && this.has('or_basket_0') && this.has('or_apple_2');
    if (!this.art) return;
    this.season = SEASON_OF[getTheme() as keyof typeof SEASON_OF] ?? 'summer'; // an unknown theme falls back to summer
    const sk = this.season;
    const grass = this.g.setDepth(-60);
    void grass;
    this.g2 = this.add.graphics().setDepth(6);
    // sky and hills, with a sunset tint that fades in during the golden shower
    this.far = this.add.image(W / 2, 0, 'or_bg_far').setOrigin(0.5, 0).setDepth(-90).setTint(SEASON_TINT[sk] ?? 0xffffff);
    this.far.setScale(W / this.far.width);
    if (this.has('or_bg_dusk')) {
      this.dusk = this.add.image(W / 2, 0, 'or_bg_dusk').setOrigin(0.5, 0).setDepth(-89).setAlpha(0);
      this.dusk.setScale(W / this.dusk.width, (this.far.displayHeight) / this.dusk.height);
    }
    if (this.has(`or_mid_${sk}`)) this.add.tileSprite(W / 2, GROUND - 78, W, 122, `or_mid_${sk}`).setOrigin(0.5, 1).setTileScale(2).setDepth(-50);
    if (this.has(`or_ground_${sk}`)) this.add.tileSprite(W / 2, GROUND - 14, W, H - GROUND + 14, `or_ground_${sk}`).setOrigin(0.5, 0).setTileScale(2.3).setDepth(-40);
    // the orchard row
    TX.forEach((x, i) => {
      const key = i === 1 && this.has('or_tree_fruit') ? 'or_tree_fruit' : 'or_tree';
      const im = this.add.image(x, GROUND + 6, key).setOrigin(0.5, 1).setDepth(2).setFlipX(i === 2);
      im.setScale(TREE_H / im.height);
      if (sk === 'autumn') im.setTint(0xffd2a0);
      else if (sk === 'winter') im.setTint(0xe2ecf4);
      this.trees.push(im);
    });
    this.basketImg = this.add.image(480, 512, 'or_basket_0').setOrigin(0.5, 1).setDepth(5).setVisible(false);
    if (this.has('or_basket_glow')) this.glowImg = this.add.image(480, 480, 'or_basket_glow').setOrigin(0.5, 1).setDepth(5.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setVisible(false);
    for (let i = 0; i < 4; i++) {
      if (!this.has('or_shower_1')) break;
      this.showerImgs.push(this.add.image(120 + i * 240, 0, 'or_shower_1').setOrigin(0.5, 0).setScale(3.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setVisible(false));
    }
    if (this.has('or_tint_strip')) this.tint = this.add.image(W / 2, H / 2, 'or_tint_strip').setDisplaySize(W, H).setDepth(7).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setVisible(false);
    this.people = [0, 1].map(() => this.add.image(0, 0, 'or_james_pose_shake_1').setOrigin(0.5, 1).setDepth(3.5).setVisible(false));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.fx = []; this.trees = []; this.showerImgs = []; this.people = [];
      this.fruit.clear(); this.shadowImgs.clear(); this.seen.clear();
    });
  }

  /** A short lived picture: it fades, drifts and spins on its own and then goes away. */
  private spawn(key: string, x: number, y: number, o: { dur?: number; vx?: number; vy?: number; spin?: number; s0?: number; s1?: number; a0?: number; add?: boolean; sway?: number; depth?: number } = {}) {
    if (!this.has(key) || this.fx.length > 46) return;
    const im = this.add.image(x, y, key).setDepth(o.depth ?? 7);
    if (o.add) im.setBlendMode(Phaser.BlendModes.ADD);
    this.fx.push({ im, t0: this.ft, dur: o.dur ?? 0.6, vx: o.vx ?? 0, vy: o.vy ?? 0, spin: o.spin ?? 0, s0: o.s0 ?? 1, s1: o.s1 ?? 1, a0: o.a0 ?? 1, sway: o.sway ?? 0, ph: Math.random() * 6 });
  }

  private tickFx(dt: number) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i], k = (this.ft - f.t0) / f.dur;
      if (k >= 1) { f.im.destroy(); this.fx.splice(i, 1); continue; }
      f.im.x += (f.vx + Math.sin(this.ft * 2 + f.ph) * f.sway) * dt;
      f.im.y += f.vy * dt;
      f.im.angle += f.spin * dt;
      f.im.setScale(Phaser.Math.Linear(f.s0, f.s1, k));
      f.im.setAlpha(f.a0 * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85));
    }
  }

  private leaf(x: number, y: number, burst: boolean) {
    const n = 1 + Math.floor(Math.random() * 8);
    this.spawn(`or_leaf_${n}`, x, y, { dur: burst ? 1.6 : 6, vx: burst ? (Math.random() - 0.5) * 140 : 0, vy: burst ? 20 + Math.random() * 40 : 28 + Math.random() * 18, spin: (Math.random() - 0.5) * 120, s0: 0.5, s1: 0.5, a0: burst ? 0.95 : 0.7, sway: 26, depth: 2.5 });
  }

  private shakeTree(i: number) {
    const t = this.trees[i];
    if (!t) return;
    this.lastTree = i;
    this.tapT = this.ft;
    this.tweens.killTweensOf(t);
    t.setAngle(0);
    this.tweens.add({ targets: t, angle: { from: -2.2, to: 2.2 }, duration: 55, yoyo: true, repeat: 4, onComplete: () => t.setAngle(0) });
    for (let k = 0; k < 6; k++) this.leaf(TX[i] + (Math.random() - 0.5) * 170, 150 + Math.random() * 90, true);
    this.spawn('or_tap_4', TX[i], TARGET_Y, { dur: 0.45, s0: 0.8, s1: 2.2, a0: 0.9, add: true });
  }

  /** What happened to each fruit since the last frame, read from the snapshots so a guest sees the same pops. */
  private watchFruit(basketX: number, ct: PlayerId | null) {
    const m = this.m;
    const now = new Map<number, Seen>();
    for (const a of m.apples) now.set(a.id, { x: a.x, y: a.y, kind: a.kind, id: a.id });
    for (const [id, old] of this.seen) {
      if (now.has(id)) continue;
      const atBasket = !!ct && old.y > BASKET_Y - 70 && Math.abs(old.x - basketX) < 100;
      if (old.kind === 'twig') {
        if (atBasket) { this.spawn('or_hit_3', old.x, BASKET_Y - 20, { dur: 0.5, s0: 0.8, s1: 1.2 }); this.wobbleT = this.ft; this.streak = 0; }
      } else if (atBasket) {
        this.catchT = this.ft;
        this.wobbleT = this.ft;
        this.spawn(old.kind === 'berry' ? 'or_pop_3' : 'or_pop_2', old.x, BASKET_Y - 24, { dur: 0.45, s0: 0.7, s1: 1.35, a0: 0.95 });
        if (old.kind === 'golden') {
          this.spawn('or_star_2', old.x, BASKET_Y - 40, { dur: 0.9, s0: 0.5, s1: 1.7, add: true });
          this.spawn('or_combo_heart', old.x, BASKET_Y - 120, { dur: 1.3, vy: -26, s0: 0.7, s1: 1 });
        }
        if (old.kind !== 'berry' && ++this.streak % 8 === 0) {
          this.spawn('or_combo_banner', W / 2, 150, { dur: 1.6, vy: -14, s0: 0.8, s1: 1.1 });
          this.spawn('or_star_3', W / 2 - 110, 150, { dur: 1, s0: 0.6, s1: 1.5, add: true });
          this.spawn('or_star_3', W / 2 + 110, 150, { dur: 1, s0: 0.6, s1: 1.5, add: true });
        }
      } else if (old.y > GROUND - 40 && old.kind !== 'berry') {
        this.spawn('or_tap_1', old.x, GROUND - 6, { dur: 0.5, s0: 0.5, s1: 1.1, a0: 0.8 }); // a soft dust ring, never a penalty
        this.streak = 0;
      }
    }
    for (const [id, n] of now) {
      const old = this.seen.get(id);
      if (!old && n.kind === 'golden' && n.y < 300) this.spawn('or_tap_5', n.x, n.y, { dur: 0.55, s0: 0.6, s1: 1.4, add: true });
      if (!old && n.kind === 'apple' && n.y < 300) this.spawn('or_spark_2', n.x, n.y, { dur: 0.5, s0: 0.5, s1: 1.2, add: true });
    }
    this.seen = now;
  }

  private fruitArt(a: Apple, c: number) {
    switch (a.kind) {
      case 'golden': return { key: a.bounced ? 'or_gold_3' : 'or_gold_2', w: 40, rot: 0 };
      case 'berry': return { key: a.id % 2 ? 'or_berry_1' : 'or_berry_2', w: 30, rot: Math.sin(c * 3 + a.id) * 12 };
      case 'twig': {
        const k = a.id % 6;
        return { key: k < 3 ? `or_twig_${k + 1}` : k === 3 ? 'or_stones' : k === 4 ? 'or_rock' : 'or_cone', w: k < 3 ? 46 : 38, rot: c * 140 + a.id * 40 };
      }
      default: return { key: a.id % 2 ? 'or_apple_2' : 'or_apple_3', w: 36, rot: Math.sin(c * 4 + a.id) * 10 };
    }
  }

  private drawArt(dt: number, basketX: number, ct: PlayerId | null) {
    const m = this.m, c = this.clock, g = this.g, g2 = this.g2;
    this.ft += dt;
    // grass between the hills and the ground strip
    g.clear();
    g2.clear();
    const [g0, g1] = GRASS[this.season] ?? GRASS.summer;
    const top = 250, bands = 16;
    for (let i = 0; i < bands; i++) {
      const k = i / (bands - 1);
      const mix = (s: number) => Math.round(((g0 >> s) & 255) + (((g1 >> s) & 255) - ((g0 >> s) & 255)) * k);
      g.fillStyle((mix(16) << 16) | (mix(8) << 8) | mix(0), 1);
      g.fillRect(0, top + ((H - top) / bands) * i, W, (H - top) / bands + 1);
    }
    const showerOn = c < m.showerUntil;
    // golden shower: dusk light over the sky, a warm pulse, and a golden rain of frames
    const sa = showerOn ? Math.min(1, (m.showerUntil - c) / 1.2, (c - (m.showerUntil - 5)) / 0.8 + 1) : 0;
    this.dusk?.setAlpha(0.6 * Math.max(0, sa));
    if (this.tint) this.tint.setVisible(sa > 0).setAlpha(Math.max(0, sa) * (0.1 + 0.05 * Math.sin(this.ft * 4)));
    const fr = 1 + (Math.floor(this.ft * 8) % 8);
    this.showerImgs.forEach((im, i) => {
      const sk = `or_shower_${((fr + i * 3) % 8) + 1}`;
      if (this.has(sk)) im.setTexture(sk);
      im.setVisible(sa > 0).setAlpha(Math.max(0, sa) * 0.3);
    });
    // drifting leaves, a few at a time
    this.leafAcc += dt;
    if (this.leafAcc > 1.1) { this.leafAcc = 0; this.leaf(Math.random() * W, 8, false); }
    // a tree the shaker tapped
    if (m.lit?.used && this.shookAt !== m.lit.at) { this.shookAt = m.lit.at; this.shakeTree(m.lit.tree); }
    // the lit target
    TX.forEach((x, i) => {
      if (!(m.lit && m.lit.tree === i)) return;
      const life = Math.max(0, 1 - (c - m.lit.at) / (m.lit.until - m.lit.at));
      g2.fillStyle(0xfff3a0, 0.25 + 0.35 * life);
      g2.fillCircle(x, TARGET_Y, 46 + (1 - life) * 14);
      g2.lineStyle(5, m.lit.used ? 0x9ad48c : 0xffd23f, 1);
      g2.strokeCircle(x, TARGET_Y, 34);
      g2.fillStyle(0xffffff, 0.95);
      g2.fillCircle(x, TARGET_Y, 10);
      if (!m.lit.used && Math.random() < 0.25) this.spawn(`or_spark_${1 + Math.floor(Math.random() * 3)}`, x + (Math.random() - 0.5) * 90, TARGET_Y + (Math.random() - 0.5) * 70, { dur: 0.7, s0: 0.5, s1: 0.9, add: true });
    });
    // tap ripples from my own taps (instant feedback before the host answers)
    for (const t of this.taps) if (!t.done) {
      t.done = true;
      this.spawn('or_tap_4', t.x, TARGET_Y, { dur: 0.4, s0: 0.7, s1: 1.8, a0: 0.8 });
    }
    this.taps = this.taps.filter((t) => c - t.t < 0.4);
    this.watchFruit(basketX, ct);
    // falling fruit, with a shadow that tightens as it nears the ground
    const live = new Set<number>();
    for (const a of m.apples) {
      live.add(a.id);
      const spec = this.fruitArt(a, this.ft);
      if (!this.has(spec.key)) {
        // missing art for one kind of fruit: a plain coloured disc keeps the game playable
        g2.fillStyle(a.kind === 'golden' ? 0xffd23f : a.kind === 'berry' ? 0xff7fa1 : a.kind === 'twig' ? 0x8a6244 : 0xe85a6a, 1);
        g2.fillCircle(a.x, a.y, a.kind === 'berry' ? 8 : 14);
        continue;
      }
      let im = this.fruit.get(a.id);
      if (!im) { im = this.add.image(a.x, a.y, spec.key).setDepth(4); this.fruit.set(a.id, im); }
      if (im.texture.key !== spec.key) im.setTexture(spec.key);
      im.setPosition(a.x, a.y).setAngle(spec.rot).setScale(spec.w / im.width);
      if (a.kind === 'golden' && a.bounced) im.setScale((spec.w / im.width) * (1 + 0.18 * Math.sin(this.ft * 20)), (spec.w / im.width) * (1 - 0.14 * Math.sin(this.ft * 20)));
      if (a.kind === 'golden' && Math.random() < 0.18) this.spawn('or_spark_1', a.x + (Math.random() - 0.5) * 30, a.y + (Math.random() - 0.5) * 30, { dur: 0.45, s0: 0.35, s1: 0.7, add: true, depth: 4.5 });
      if (a.kind !== 'berry') {
        let sh = this.shadowImgs.get(a.id);
        const dist = GROUND - a.y;
        const key = `or_shadow_${dist > 260 ? 4 : dist > 170 ? 3 : dist > 90 ? 2 : 1}`;
        if (!sh && this.has(key)) { sh = this.add.image(a.x, GROUND - 4, key).setDepth(1.5); this.shadowImgs.set(a.id, sh); }
        if (sh) { if (sh.texture.key !== key) sh.setTexture(key); sh.setPosition(a.x, GROUND - 4).setScale(0.8).setAlpha(dist > 0 ? Math.min(0.9, 0.3 + (1 - dist / 380)) : 0); }
      }
    }
    for (const [id, im] of this.fruit) if (!live.has(id)) { im.destroy(); this.fruit.delete(id); }
    for (const [id, im] of this.shadowImgs) if (!live.has(id) || !this.fruit.has(id)) { im.destroy(); this.shadowImgs.delete(id); }
    // the basket: fills up as you catch, wobbles on a catch, glows for a golden apple
    const b = this.basketImg!;
    b.setVisible(!!ct);
    if (ct) {
      const n = m.caught;
      const state = n >= 28 ? 4 : n >= 18 ? 3 : n >= 10 ? 2 : n >= 4 ? 1 : 0;
      const wob = this.ft - this.wobbleT < 0.3;
      const key = wob && state === 0 && this.has('or_basket_wob_1') ? (Math.floor((this.ft - this.wobbleT) * 14) % 2 ? 'or_basket_wob_2' : 'or_basket_wob_1') : `or_basket_${state}`;
      if (b.texture.key !== key && this.has(key)) b.setTexture(key);
      const sc = 124 / 170 * (key.startsWith('or_basket_wob') ? 170 / 124 : 1);
      const pop = wob ? 1 + 0.07 * Math.sin((this.ft - this.wobbleT) * 40) : 1;
      b.setPosition(basketX, 508).setScale(sc * pop, sc / pop);
      if (this.glowImg) {
        const glow = showerOn ? 0.5 + 0.3 * Math.sin(this.ft * 6) : 0;
        this.glowImg.setVisible(glow > 0).setAlpha(glow).setPosition(basketX, 508).setScale(124 / 170);
      }
      g2.fillStyle(0x000000, 0.14);
      g2.fillEllipse(basketX, GROUND + 6, 140, 16);
    } else this.glowImg?.setVisible(false);
    this.drawPeople(basketX, ct);
    this.tickFx(dt);
  }

  private drawPeople(basketX: number, ct: PlayerId | null) {
    const c = this.clock, m = this.m;
    const k = Phaser.Math.Clamp((c - SWAP_AT) / 3, 0, 1);
    const ease = k * k * (3 - 2 * k);
    const moving = c >= SWAP_AT && k < 1;
    const end = this.duration - c < 1.6;
    const shakerX = TX[this.lastTree] - 78;
    const catchX = basketX < 790 ? basketX + 108 : basketX - 108;
    (['A', 'B'] as PlayerId[]).forEach((p, i) => {
      const im = this.people[i];
      const set = SETS[this.isBot(p) ? 'mochi' : p === 'A' ? 'james' : 'rachel'];
      const from = p === 'A' ? shakerX : catchX, to = p === 'A' ? catchX : shakerX;
      const x = Phaser.Math.Linear(from, to, c < SWAP_AT ? 0 : ease);
      const asShaker = this.shaker() === p, asCatcher = ct === p;
      let key: string, flip = false;
      if (end) key = set.win[Math.floor(this.ft * 3) % set.win.length];
      else if (moving) {
        const right = to > from;
        key = right || !set.run.w ? set.run.e : set.run.w;
        flip = !right && !set.run.w;
      } else if (asShaker) {
        const t = this.ft - this.tapT;
        key = set.shake[t < 0.4 ? [1, 2, 1, 2][Math.min(3, Math.floor(t / 0.1))] % set.shake.length : 0];
        if (this.isBot(p) && t < 0.4) key = set.shake[Math.floor(t / 0.1) % set.shake.length];
      } else {
        const t = this.ft - this.catchT;
        key = set.catch[t < 0.45 ? [1, 2, 2, 3][Math.min(3, Math.floor(t / 0.11))] % set.catch.length : 0];
        flip = x > basketX; // look toward the basket
      }
      const role = c < SWAP_AT ? (p === 'A' ? 'Shaker' : 'Catcher') : c >= SWAP_END ? (p === 'A' ? 'Catcher' : 'Shaker') : '';
      if (!this.has(key) || !this.has(set.catch[0])) {
        // art for this person is missing: keep their name and role visible above where they stand
        im.setVisible(false);
        this.texts.names[i].setPosition(x, GROUND - 60).setText(`${this.name(p)}\n${role}`);
        return;
      }
      if (im.texture.key !== key) im.setTexture(key);
      const base = this.textures.get(set.catch[0]).getSourceImage().height;
      im.setVisible(true).setPosition(x, GROUND + 22).setFlipX(flip).setScale(PERSON_H / (this.isBot(p) ? set.h : base) * (this.isBot(p) ? 0.85 : 1));
      void asCatcher;
      this.texts.names[i].setPosition(x, GROUND + 22 - im.displayHeight - 16).setText(`${this.name(p)}\n${role}`);
    });
    void m;
  }

  // ---------- host simulation ----------
  protected hostTick(dt: number) {
    const m = this.m, c = this.clock;
    const sh = this.shaker(), ct = this.catcher();
    if (!this.whistled && c >= SWAP_AT) {
      this.whistled = true;
      m.flash = { text: '🎶 Swap places!', until: c + 3 };
    }
    // the catcher's basket: mine directly, my partner's from their input, the bot's by chasing apples
    if (ct && this.can(ct)) m.basketX = this.bx;
    if (ct && this.isBot(ct)) {
      const target = m.apples.filter((a) => a.kind !== 'twig').sort((a, b) => b.y - a.y)[0];
      const goal = target ? target.x : 480;
      const step = 340 * dt;
      m.basketX += Phaser.Math.Clamp(goal - m.basketX, -step, step);
    }
    // rhythm nodes light up for the shaker
    if (sh && c >= this.nextLit) {
      m.lit = { tree: Math.floor(Math.random() * 3), until: c + 0.9, at: c };
      this.nextLit = c + 1.15;
    }
    if (m.lit && c > m.lit.until) m.lit = null;
    if (sh && this.isBot(sh) && m.lit && !m.lit.used && c > m.lit.at + 0.35) this.onInput(sh, 'shake', m.lit.tree);
    // twigs to dodge
    if (sh && c >= this.nextTwig) {
      m.apples.push({ id: this.nextId++, x: 100 + Math.random() * 760, y: -20, vy: 230, kind: 'twig' });
      this.nextTwig = c + 2.2 + Math.random() * 1.2;
    }
    // golden apple pastel shower
    if (c < m.showerUntil && c >= this.nextBerry) {
      m.apples.push({ id: this.nextId++, x: 60 + Math.random() * 840, y: -10, vy: 200 + Math.random() * 100, kind: 'berry' });
      this.nextBerry = c + 0.1;
    }
    // physics and catching
    for (const a of m.apples) {
      a.vy += (a.bounced ? 700 : a.kind === 'golden' ? 600 : 260) * dt;
      a.y += a.vy * dt;
      if (a.kind === 'golden' && !a.bounced && a.y >= GROUND - 12) {
        a.bounced = true; // golden apples bounce once
        a.vy = -330;
        a.y = GROUND - 12;
      }
      if (ct && a.y > BASKET_Y - 22 && a.y < BASKET_Y + 24 && Math.abs(a.x - m.basketX) < 78 && a.vy > 0) {
        if (a.kind === 'twig') {
          m.score = Math.max(0, m.score - 2);
          m.twigs++;
        } else if (a.kind === 'golden') {
          m.score += 5;
          m.goldens++;
          m.caught++;
          m.showerUntil = c + 5;
          m.flash = { text: '🌈 Pastel Shower!', until: c + 3 };
        } else {
          m.score += 1;
          m.caught++;
        }
        a.y = 9999;
      }
    }
    m.apples = m.apples.filter((a) => a.y < GROUND + 30 && a.y < 9000);
    if (m.flash && c > m.flash.until) m.flash = null;
  }

  protected onInput(from: PlayerId, k: string, v: unknown) {
    const m = this.m, c = this.clock;
    if (k === 'bx' && from === this.catcher() && !this.can(from) && typeof v === 'number' && Number.isFinite(v)) m.basketX = Phaser.Math.Clamp(v, 80, W - 80);
    if (k === 'shake' && typeof v === 'number' && TX[v] !== undefined && from === this.shaker() && m.lit && !m.lit.used && m.lit.tree === (v as number) && c <= m.lit.until + 0.15) {
      m.lit.used = true;
      const gold = Math.random() < 0.1;
      m.apples.push({ id: this.nextId++, x: TX[v as number] + (Math.random() - 0.5) * 120, y: 200, vy: gold ? 160 : 60, kind: gold ? 'golden' : 'apple' });
      if (Math.random() < 0.5) m.apples.push({ id: this.nextId++, x: TX[v as number] + (Math.random() - 0.5) * 160, y: 210, vy: 40, kind: 'apple' });
    }
  }

  protected snapshot() {
    return { clock: this.clock, m: this.m };
  }
  protected applySnapshot(s: unknown) {
    const sm = (s as { m?: Partial<Model> } | null)?.m;
    if (!sm || typeof sm !== 'object') return; // a damaged snapshot keeps the last good picture
    this.m = { ...this.m, ...sm, apples: Array.isArray(sm.apples) ? sm.apples : [] };
    if (!Number.isFinite(this.m.basketX)) this.m.basketX = 480;
  }

  // ---------- drawing (every client) ----------
  protected draw(dt: number) {
    const me = this.role, ct = this.catcher(), sh = this.shaker(), m = this.m, c = this.clock;
    // my basket moves with the keys too
    if (ct === me && this.keys) {
      const dir = (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0) - (this.keys.A.isDown || this.keys.LEFT.isDown ? 1 : 0);
      this.bx = Phaser.Math.Clamp(this.bx + dir * 560 * dt, 80, W - 80);
    }
    // a guest sends its basket position to the host 30 times a second
    this.bxAcc += dt;
    if (ct === me && !this.host && this.bxAcc >= 1 / 30) {
      this.bxAcc = 0;
      this.act(me, 'bx', this.bx);
    }
    const basketX = ct === me ? this.bx : m.basketX;

    if (this.art) this.drawArt(dt, basketX, ct);
    else {
      const g = this.g;
      g.clear();
      g.fillStyle(0xcfe9f6, 1);
      g.fillRect(-2000, -2000, 5000, 2000 + GROUND - 120);
      g.fillStyle(0xfde7d6, 1);
      g.fillRect(-2000, 160, 5000, 220);
      g.fillStyle(0xbfe3a4, 1);
      g.fillRect(-2000, GROUND - 120, 5000, 3000);
      g.fillStyle(0xa8d48c, 1);
      g.fillRect(-2000, GROUND - 12, 5000, 3000);
      // trees
      TX.forEach((x, i) => {
        g.fillStyle(0x9c7a54, 1);
        g.fillRect(x - 16, 190, 32, GROUND - 190);
        for (const [dx, dy, r, col] of [[-62, 120, 62, 0x7cc47a], [62, 124, 60, 0x84cc82], [0, 86, 78, 0x8fd48c], [-30, 60, 50, 0x9bda98], [38, 62, 46, 0xa6e0a2]] as const) {
          g.fillStyle(col, 1);
          g.fillCircle(x + dx, dy + 40, r);
        }
        for (let k = 0; k < 6; k++) {
          g.fillStyle(0xe85a6a, 1);
          g.fillCircle(x - 70 + k * 28 + ((i + k) % 3) * 6, 130 + ((k * 37 + i * 11) % 60), 7);
        }
        // the node the shaker should tap
        if (m.lit && m.lit.tree === i) {
          const life = Math.max(0, 1 - (c - m.lit.at) / (m.lit.until - m.lit.at));
          g.fillStyle(0xfff3a0, 0.35 + 0.4 * life);
          g.fillCircle(x, 150, 46 + (1 - life) * 14);
          g.lineStyle(5, m.lit.used ? 0x9ad48c : 0xffd23f, 1);
          g.strokeCircle(x, 150, 34);
          g.fillStyle(0xffffff, 0.95);
          g.fillCircle(x, 150, 10);
        }
      });
      // tap feedback
      this.taps = this.taps.filter((t) => c - t.t < 0.4);
      for (const t of this.taps) {
        g.lineStyle(4, 0xffffff, 1 - (c - t.t) / 0.4);
        g.strokeCircle(t.x, t.y, 30 + (c - t.t) * 100);
      }
      // apples, golden apples, berries and twigs
      for (const a of m.apples) {
        if (a.kind === 'twig') {
          g.lineStyle(6, 0x8a6244, 1);
          g.beginPath();
          g.moveTo(a.x - 22, a.y + 6);
          g.lineTo(a.x + 22, a.y - 6);
          g.strokePath();
          g.fillStyle(0x7cc47a, 1);
          g.fillCircle(a.x + 14, a.y - 4, 7);
          g.fillCircle(a.x - 10, a.y + 4, 6);
        } else if (a.kind === 'berry') {
          g.fillStyle(0xff7fa1, 1);
          g.fillCircle(a.x, a.y, 8);
          g.fillStyle(0xffffff, 0.7);
          g.fillCircle(a.x - 2, a.y - 3, 2.5);
        } else {
          const gold = a.kind === 'golden';
          g.fillStyle(0x000000, 0.12);
          g.fillEllipse(a.x, GROUND - 4, 26, 8);
          g.fillStyle(gold ? 0xffd23f : 0xe85a6a, 1);
          g.fillCircle(a.x, a.y, gold ? 17 : 14);
          g.fillStyle(0xffffff, 0.75);
          g.fillCircle(a.x - 5, a.y - 6, gold ? 5 : 4);
          g.fillStyle(0x6a8f3a, 1);
          g.fillRect(a.x - 1, a.y - (gold ? 21 : 18), 3, 7);
          if (gold) {
            g.lineStyle(3, 0xfff3a0, 0.8);
            g.strokeCircle(a.x, a.y, 22 + Math.sin(c * 12) * 3);
          }
        }
      }
      // basket
      if (ct) {
        g.fillStyle(0x000000, 0.15);
        g.fillEllipse(basketX, GROUND - 6, 150, 18);
        g.fillStyle(0xc99a62, 1);
        g.fillRoundedRect(basketX - 72, BASKET_Y - 4, 144, 44, 12);
        g.fillStyle(0xdcb27a, 1);
        g.fillRoundedRect(basketX - 72, BASKET_Y - 12, 144, 16, 8);
        g.lineStyle(2, 0xa87a46, 0.8);
        for (let k = -2; k <= 2; k++) {
          g.beginPath();
          g.moveTo(basketX + k * 28, BASKET_Y + 4);
          g.lineTo(basketX + k * 28, BASKET_Y + 38);
          g.strokePath();
        }
        g.fillStyle(0xff9fbd, 1);
        g.fillCircle(basketX + 56, BASKET_Y - 4, 6);
      }
      // avatars, swapping places during the whistle
      const k = Phaser.Math.Clamp((c - SWAP_AT) / 3, 0, 1);
      const ease = k * k * (3 - 2 * k);
      const ax = Phaser.Math.Linear(110, 850, c < SWAP_AT ? 0 : ease);
      const bx2 = Phaser.Math.Linear(850, 110, c < SWAP_AT ? 0 : ease);
      this.texts.names[0].setPosition(ax, 106).setText(`🧑 ${this.name('A')}\n${c < SWAP_AT ? 'Shaker' : c >= SWAP_END ? 'Catcher' : ''}`);
      this.texts.names[1].setPosition(bx2, 106).setText(`👩 ${this.name('B')}\n${c < SWAP_AT ? 'Catcher' : c >= SWAP_END ? 'Shaker' : ''}`);

    }
    this.texts.score.setText(`🍎 ${m.score}`);
    this.texts.time.setText(`${Math.max(0, Math.ceil(this.duration - c))}s`);
    const mine = sh === me ? 'You shake: tap the glowing tree' : ct === me ? 'You catch: slide or use A and D' : 'Swapping places…';
    this.texts.role.setText(mine);
    const showerOn = c < m.showerUntil;
    this.texts.banner.setText(m.flash ? m.flash.text : showerOn ? `🍓 Pastel Shower ${Math.ceil(m.showerUntil - c)}` : '');
  }

  protected result(): MGResult {
    const m = this.m;
    const r = emptyResult('ORCHARD_HARVEST');
    r.score = m.score;
    r.coins = m.score * 3;
    r.eventTokens = Math.floor(m.score / 8);
    r.ingredients = Math.floor(m.caught / 3);
    r.stars = m.score >= 45 ? 3 : m.score >= 25 ? 2 : m.score >= 10 ? 1 : 0;
    r.notes = [`${m.caught} caught, ${m.goldens} golden, ${m.twigs} twig hits`, 'Apples go to your café pantry for Matcha Masters recipes'];
    return r;
  }
}
