import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import { emptyResult, type MGResult } from '../../state/minigames';
import { MinigameScene, W } from './base';

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
  private taps: { x: number; y: number; t: number }[] = [];

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
    if (k === 'bx' && from === this.catcher() && !this.can(from)) m.basketX = Phaser.Math.Clamp(v as number, 80, W - 80);
    if (k === 'shake' && from === this.shaker() && m.lit && !m.lit.used && m.lit.tree === (v as number) && c <= m.lit.until + 0.15) {
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
    this.m = (s as { m: Model }).m;
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
