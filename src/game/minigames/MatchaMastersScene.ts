import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import { CAFE_DECOR, emptyResult, RECIPES, type MGResult } from '../../state/minigames';
import { getState } from '../../state/store';
import { FONT, MinigameScene, coverBox, fitBox } from './base';

interface Order { id: number; name: string; recipe: string[]; patience: number; combo: boolean; claimed: boolean; face: string }
interface Model {
  orders: Order[];
  counter: string[];
  pass: { orderId: number } | null;
  stage: 'idle' | 'meter' | 'topping' | 'serve';
  meterT0: number;
  band: { c: number; w: number };
  quality: number;
  topIdx: number;
  tops: { x: number; y: number }[];
  score: number;
  mult: number;
  served: number;
  missed: number;
  perfect: number;
  combos: number;
  lastTip: number;
  combo: { deadline: number; taps: { A?: boolean; B?: boolean } } | null;
  flash: { text: string; until: number } | null;
}

const ING: [string, string][] = [['Matcha', 'matcha'], ['Oat Milk', 'oatmilk'], ['Milk', 'milk'], ['Ice', 'ice'], ['Boba', 'boba'], ['Strawberry', 'strawberry'], ['Espresso', 'cocoa']];
const MENU: { name: string; recipe: string[]; combo?: boolean }[] = [
  { name: 'Matcha Latte', recipe: ['Matcha', 'Oat Milk', 'Ice'] },
  { name: 'Boba Matcha', recipe: ['Matcha', 'Oat Milk', 'Ice', 'Boba'] },
  { name: 'Strawberry Matcha', recipe: ['Matcha', 'Milk', 'Strawberry'] },
  { name: 'Iced Coffee', recipe: ['Espresso', 'Ice', 'Milk'] },
  { name: 'Strawberry Latte', recipe: ['Espresso', 'Milk', 'Strawberry'] },
  { name: 'Couples Combo: Matching Matcha Lattes', recipe: ['Matcha', 'Oat Milk', 'Ice'], combo: true },
];
const FACES = ['🐻', '🐰', '🐱', '🐶', '🦊', '🐼'];
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
const PATIENCE_SECONDS = 28;

export class MatchaMastersScene extends MinigameScene {
  constructor() {
    super('MatchaMastersScene');
  }
  protected duration = 90;
  private m!: Model;
  private nextSpawn = 0.5;
  private nextId = 1;
  private botT = 0;
  private botPlan: string[] = [];
  private cards: { name: Phaser.GameObjects.Text; recipe: Phaser.GameObjects.Text; hearts: Phaser.GameObjects.Text }[] = [];
  private t!: Record<string, Phaser.GameObjects.Text>;
  private btn: Record<string, ReturnType<MinigameScene['button']>> = {};
  private lastEnabled = '';
  private hasBg = false;
  private cardImgs: Phaser.GameObjects.Image[] = [];
  private drinkImg?: Phaser.GameObjects.Image;
  private startMult = 1;

  private fresh(): Model {
    return { orders: [], counter: [], pass: null, stage: 'idle', meterT0: 0, band: { c: 0.5, w: 0.16 }, quality: 1, topIdx: 0, tops: [], score: 0, mult: this.startMult, served: 0, missed: 0, perfect: 0, combos: 0, lastTip: 0, combo: null, flash: null };
  }

  private meterPos(): number {
    return 0.5 + 0.5 * Math.sin((this.clock - this.m.meterT0) * 3.2 - Math.PI / 2);
  }

  protected build() {
    this.startMult = 1 + Math.min(0.5, getState().ingredients * 0.05); // a stocked pantry gives a head start
    this.m = this.fresh();
    this.nextSpawn = 0.5;
    this.nextId = 1;
    this.botPlan = [];
    this.botT = 0;
    this.lastEnabled = '';
    this.cards = [];
    const mk = (x: number, y: number, size: number, color = '#6b4f4f', ox = 0.5, oy = 0.5) =>
      this.add.text(x, y, '', { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', wordWrap: { width: 400 } }).setOrigin(ox, oy).setDepth(10);
    for (let i = 0; i < 4; i++) {
      const x = 30 + i * 229;
      this.cards.push({
        name: this.add.text(x + 105, 28, '', { fontFamily: FONT, fontSize: '15px', color: '#6b4f4f', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5, 0).setDepth(10),
        recipe: this.add.text(x + 105, 66, '', { fontFamily: FONT, fontSize: '13px', color: '#8a6b6b', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5, 0).setDepth(10),
        hearts: this.add.text(x + 105, 104, '', { fontFamily: FONT, fontSize: '18px', color: '#ff7fa1' }).setOrigin(0.5, 0).setDepth(10),
      });
    }
    this.t = {
      score: mk(24, 150, 24, '#6b4f4f', 0, 0),
      mult: mk(480, 135, 20, '#a05a7a'),
      time: mk(936, 150, 24, '#6b4f4f', 1, 0),
      aTitle: mk(246, 160, 20, '#a05a7a'),
      bTitle: mk(714, 160, 20, '#a05a7a'),
      counter: mk(246, 292, 16),
      bState: mk(714, 232, 17),
      banner: mk(480, 300, 38, '#d9628a'),
    };
    // Partner A: sous chef
    ING.forEach(([name, icon], i) => {
      const x = 80 + (i % 4) * 112, y = 212 + Math.floor(i / 4) * 54;
      this.btn[`ing:${name}`] = this.button(x, y, 104, 46, `\u2003\u2003${name}`, { size: 13, onDown: () => this.act('A', 'add', name) });
      if (this.textures.exists(`mg_ing_${icon}`)) fitBox(this.add.image(x - 38, y, `mg_ing_${icon}`).setDepth(25), 32, 38);
    });
    if (this.textures.exists('mg_bg_cafe_day')) {
      coverBox(this.add.image(480, 270, 'mg_bg_cafe_day').setDepth(-90), 960, 540);
      this.add.rectangle(480, 270, 960, 540, 0xfff3e8, 0.4).setDepth(-80);
      this.hasBg = true;
    }
    if (this.textures.exists('mg_rush_badge')) fitBox(this.add.image(372, 135, 'mg_rush_badge').setDepth(11), 26, 26);
    this.cardImgs = [0, 1, 2, 3].map((i) => fitBox(this.add.image(30 + i * 229 + 184, 122, 'mg_cust_1').setOrigin(0.5, 1).setDepth(11).setVisible(false), 34, 56));
    this.drinkImg = fitBox(this.add.image(714, 330, 'mg_cup_1').setDepth(12).setVisible(false), 96, 90);
    this.btn.clear = this.button(100, 468, 100, 44, 'Clear', { fill: 0xe8e0f0, onDown: () => this.act('A', 'clear') });
    this.btn.pass = this.button(330, 468, 180, 44, 'Pass to barista ➜', { fill: 0xbfe8b0, size: 17, onDown: () => this.act('A', 'pass') });
    // Partner B: barista
    this.btn.steam = this.button(714, 410, 200, 56, '♨ Steam!', { fill: 0xffd23f, size: 24, onDown: () => this.act('B', 'meter', this.meterPos()) });
    this.btn.serve = this.button(714, 410, 200, 56, 'Serve ✓', { fill: 0xbfe8b0, size: 24, onDown: () => this.act('B', 'serve') });
    // couples combo cheer, for both
    this.btn.cheer = this.button(480, 380, 220, 70, '💞 CHEER!', { fill: 0xff9fbd, size: 30, onDown: () => this.act(this.role, 'cheer') });
    this.btn.cheer.setVisible(false);
    this.exitButton();
    // tap the toppings in order
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const m = this.m;
      if (m.stage !== 'topping' || !this.can('B')) return;
      const d = m.tops[m.topIdx];
      if (d && Math.hypot(p.worldX - d.x, p.worldY - d.y) < 36) this.act('B', 'dot', m.topIdx);
    });
  }

  // ---------- host simulation ----------
  protected hostTick(dt: number) {
    const m = this.m, c = this.clock;
    for (const o of m.orders) o.patience -= dt / PATIENCE_SECONDS;
    for (const o of m.orders.filter((x) => x.patience <= 0)) {
      m.missed++;
      m.mult = Math.max(1, m.mult - 0.5);
      m.flash = { text: `${o.face} left unhappy`, until: c + 1.4 };
      if (m.pass?.orderId === o.id) {
        m.pass = null;
        m.stage = 'idle';
      }
    }
    m.orders = m.orders.filter((o) => o.patience > 0);
    if (c >= this.nextSpawn && m.orders.length < 4) {
      const d = MENU[Math.floor(Math.random() * MENU.length)];
      m.orders.push({ id: this.nextId++, name: d.name, recipe: d.recipe, patience: 1, combo: !!d.combo, claimed: false, face: FACES[Math.floor(Math.random() * FACES.length)] });
      this.nextSpawn = c + 6 + Math.random() * 3;
    }
    if (m.combo && c > m.combo.deadline) {
      m.flash = { text: 'Too slow to cheer!', until: c + 1.2 };
      m.combo = null;
    }
    if (m.flash && c > m.flash.until) m.flash = null;
    this.bots(dt);
  }

  /** The Mochi bot plays whichever role you are not playing. */
  private bots(dt: number) {
    const m = this.m;
    this.botT -= dt;
    if (m.combo) {
      for (const r of ['A', 'B'] as PlayerId[]) if (this.isBot(r) && !m.combo.taps[r] && this.botT < 0) { this.onInput(r, 'cheer'); this.botT = 0.4; }
    }
    if (this.botT > 0) return;
    if (this.isBot('A') && !m.pass) {
      if (this.botPlan.length === 0 && m.counter.length === 0) {
        const o = m.orders.find((x) => !x.claimed);
        if (o) this.botPlan = [...o.recipe];
      }
      if (this.botPlan.length) { this.onInput('A', 'add', this.botPlan.shift()); this.botT = 0.7; if (!this.botPlan.length) this.botT = 0.5; }
      else if (m.counter.length) { this.onInput('A', 'pass'); this.botT = 0.6; }
    }
    if (this.isBot('B')) {
      if (m.stage === 'meter' && Math.abs(this.meterPos() - m.band.c) < 0.07) { this.onInput('B', 'meter', this.meterPos()); this.botT = 0.4; }
      else if (m.stage === 'topping') { this.onInput('B', 'dot', m.topIdx); this.botT = 0.55; }
      else if (m.stage === 'serve') { this.onInput('B', 'serve'); this.botT = 0.5; }
    }
  }

  protected onInput(from: PlayerId, k: string, v?: unknown) {
    const m = this.m, c = this.clock;
    if (k === 'add' && from === 'A' && m.counter.length < 4) m.counter.push(v as string);
    else if (k === 'clear' && from === 'A') m.counter = [];
    else if (k === 'pass' && from === 'A' && !m.pass && m.counter.length) {
      const o = m.orders.find((x) => !x.claimed && sameSet(x.recipe, m.counter));
      if (o) {
        o.claimed = true;
        m.pass = { orderId: o.id };
        m.stage = 'meter';
        m.meterT0 = c;
        m.band = { c: 0.25 + Math.random() * 0.5, w: 0.16 };
      } else {
        m.score = Math.max(0, m.score - 3);
        m.flash = { text: 'Wrong mix! −3', until: c + 1.2 };
      }
      m.counter = [];
      this.botPlan = [];
    } else if (k === 'meter' && from === 'B' && m.stage === 'meter') {
      const d = Math.abs((v as number) - m.band.c); // judged on the barista's own screen, so lag does not cost them
      m.quality = d <= m.band.w / 2 ? 1 : d <= m.band.w ? 0.65 : 0.35;
      m.stage = 'topping';
      m.topIdx = 0;
      m.tops = [0, 1, 2].map(() => ({ x: 580 + Math.random() * 270, y: 270 + Math.random() * 110 }));
    } else if (k === 'dot' && from === 'B' && m.stage === 'topping' && v === m.topIdx) {
      m.topIdx++;
      if (m.topIdx >= 3) m.stage = 'serve';
    } else if (k === 'serve' && from === 'B' && m.stage === 'serve') {
      const o = m.orders.find((x) => x.id === m.pass?.orderId);
      m.pass = null;
      m.stage = 'idle';
      if (!o) return;
      const tip = Math.round(m.quality * 10 * m.mult * (0.5 + 0.5 * Math.max(0, o.patience)));
      m.score += 10 + tip;
      m.lastTip = tip;
      m.served++;
      if (m.quality === 1) m.perfect++;
      m.mult = Math.min(3, m.mult + 0.25);
      m.orders = m.orders.filter((x) => x.id !== o.id);
      m.flash = { text: `+${10 + tip}`, until: c + 1 };
      if (o.combo) m.combo = { deadline: c + 2, taps: {} };
    } else if (k === 'cheer' && m.combo) {
      m.combo.taps[from] = true;
      if (m.combo.taps.A && m.combo.taps.B) {
        m.score += m.lastTip; // double the tip
        m.combos++;
        m.flash = { text: `💞 In sync! Tip doubled +${m.lastTip}`, until: c + 1.6 };
        m.combo = null;
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
    if (!this.hasBg) {
      g.fillStyle(0xfff3e8, 1);
      g.fillRect(-2000, -2000, 5000, 5000);
    }
    g.fillStyle(0xf6dcc8, this.hasBg ? 0.6 : 1);
    g.fillRect(-2000, 0, 5000, 130);
    // ticket rail
    g.fillStyle(0xb98a5a, 1);
    g.fillRoundedRect(14, 8, 932, 14, 6);
    for (let i = 0; i < 4; i++) {
      const o = m.orders[i], x = 30 + i * 229;
      if (!o) {
        this.cardImgs[i]?.setVisible(false);
        this.cards[i].name.setText('');
        this.cards[i].recipe.setText('');
        this.cards[i].hearts.setText('');
        g.fillStyle(0xffffff, 0.35);
        g.fillRoundedRect(x, 22, 210, 102, 12);
        continue;
      }
      g.fillStyle(0x000000, 0.08);
      g.fillRoundedRect(x, 26, 210, 102, 12);
      g.fillStyle(o.combo ? 0xffe0ea : 0xffffff, 1);
      g.fillRoundedRect(x, 22, 210, 102, 12);
      if (o.claimed) {
        g.fillStyle(0xbfe8b0, 1);
        g.fillRoundedRect(x, 22, 210, 8, { tl: 12, tr: 12, bl: 0, br: 0 });
      }
      const hearts = Math.max(0, Math.ceil(o.patience * 5));
      this.cards[i].name.setText(o.combo ? '💞 Couples Combo' : o.name);
      const ci = this.cardImgs[i];
      const ck = `mg_cust_${(FACES.indexOf(o.face) % 6) + 1}`;
      if (ci && this.textures.exists(ck)) fitBox(ci.setTexture(ck).setVisible(true), 34, 56);
      this.cards[i].recipe.setText(o.recipe.join(' + '));
      this.cards[i].hearts.setText('♥'.repeat(hearts) + '♡'.repeat(5 - hearts)).setColor(hearts <= 1 ? '#e8503a' : '#ff7fa1');
    }
    // panels
    this.panel(24, 140, 444, 388, 0xffffff, me === 'A' ? 0.95 : 0.55);
    this.panel(492, 140, 444, 388, 0xffffff, me === 'B' ? 0.95 : 0.55);
    // A: counter slots
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0xf3e6d8, 1);
      g.fillRoundedRect(60 + i * 96, 322, 86, 46, 10);
    }
    const slotText = m.counter.map((n) => ING.find((x) => x[0] === n)?.[1] ?? '?');
    this.t.counter.setPosition(246, 396).setText(m.counter.length ? m.counter.join(' + ') : 'Prep counter is empty');
    slotText.forEach((s, i) => {
      if (!this.slotLabels[i]) this.slotLabels[i] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '28px' }).setOrigin(0.5).setDepth(10);
      this.slotLabels[i].setPosition(103 + i * 96, 345).setText(s);
    });
    for (let i = slotText.length; i < this.slotLabels.length; i++) this.slotLabels[i].setText('');
    // B: pass, meter, toppings
    let bLine = 'Waiting for a drink to come across the pass';
    if (m.stage === 'meter') {
      bLine = 'Tap Steam when the marker is in the green';
      g.fillStyle(0xe8e0f0, 1);
      g.fillRoundedRect(540, 290, 348, 34, 12);
      g.fillStyle(0x9ad48c, 1);
      g.fillRoundedRect(540 + (m.band.c - m.band.w / 2) * 348, 290, m.band.w * 348, 34, 8);
      const pos = this.meterPos();
      g.fillStyle(0xe85a6a, 1);
      g.fillRoundedRect(540 + pos * 348 - 5, 282, 10, 50, 5);
    } else if (m.stage === 'topping') {
      bLine = `Trace the toppings in order: ${Math.min(m.topIdx + 1, 3)} of 3`;
      m.tops.forEach((d, i) => {
        if (!this.dotLabels[i]) this.dotLabels[i] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5).setDepth(11);
        const done = i < m.topIdx, next = i === m.topIdx;
        g.fillStyle(done ? 0x9ad48c : next ? 0xff7fa1 : 0xe8c8d8, 1);
        g.fillCircle(d.x, d.y, next ? 30 + Math.sin(c * 8) * 2 : 26);
        this.dotLabels[i].setPosition(d.x, d.y).setText(`${i + 1}`);
        if (i > 0) {
          const p = m.tops[i - 1];
          g.lineStyle(4, i <= m.topIdx ? 0x9ad48c : 0xe8c8d8, 0.8);
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(d.x, d.y);
          g.strokePath();
        }
      });
    } else if (m.stage === 'serve') bLine = 'Looks lovely! Serve it';
    if (m.stage !== 'topping') this.dotLabels.forEach((l) => l.setText(''));
    if (this.drinkImg) {
      const show = (m.stage === 'serve' || m.stage === 'topping') && !!m.pass;
      this.drinkImg.setVisible(show && this.textures.exists('mg_cup_1'));
      if (show) fitBox(this.drinkImg.setTexture(`mg_cup_${((m.pass!.orderId - 1) % 8) + 1}`), 96, 90).setPosition(m.stage === 'serve' ? 714 : 540, m.stage === 'serve' ? 330 : 250);
    }
    this.t.bState.setText(bLine);
    // text
    this.t.score.setText(`⭐ ${m.score}`);
    this.t.mult.setText(`Café Rush ×${m.mult.toFixed(2)}`);
    this.t.time.setText(`${Math.max(0, Math.ceil(this.duration - c))}s`);
    this.t.aTitle.setText(`🧑 ${this.name('A')}: Sous Chef`);
    this.t.bTitle.setText(`👩 ${this.name('B')}: Barista`);
    this.t.banner.setText(m.flash?.text ?? '');
    // buttons follow the roles and the stage
    const comboOpen = !!m.combo;
    const enabled = `${me}${m.stage}${m.counter.length}${m.pass ? 1 : 0}${comboOpen}`;
    if (enabled !== this.lastEnabled) {
      this.lastEnabled = enabled;
      const a = this.can('A'), b = this.can('B');
      for (const [name] of ING) this.btn[`ing:${name}`].setEnabled(a && m.counter.length < 4);
      this.btn.clear.setEnabled(a && m.counter.length > 0);
      this.btn.pass.setEnabled(a && m.counter.length > 0 && !m.pass);
      this.btn.steam.setVisible(m.stage !== 'serve');
      this.btn.steam.setEnabled(b && m.stage === 'meter');
      this.btn.serve.setVisible(m.stage === 'serve');
      this.btn.serve.setEnabled(b);
      this.btn.cheer.setVisible(comboOpen);
    }
    if (m.combo) {
      this.btn.cheer.setLabel(`💞 CHEER! ${Math.max(0, m.combo.deadline - c).toFixed(1)}s`);
      this.btn.cheer.setFill(m.combo.taps[me] ? 0xbfe8b0 : 0xff9fbd);
    }
  }
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private dotLabels: Phaser.GameObjects.Text[] = [];

  protected result(): MGResult {
    const m = this.m;
    const r = emptyResult('MATCHA_MASTERS');
    r.score = m.score;
    r.coins = m.score;
    r.stars = m.score >= 260 ? 3 : m.score >= 150 ? 2 : m.score >= 60 ? 1 : 0;
    const have = getState().recipes;
    if (r.stars >= 3) {
      const next = RECIPES.find((x) => !have.includes(x));
      if (next) r.recipes = [next];
      const decor = CAFE_DECOR[Math.min(have.length, CAFE_DECOR.length - 1)];
      r.items = [decor];
    }
    r.notes = [`${m.served} served, ${m.perfect} perfect, ${m.missed} left unhappy`, `${m.combos} Couples Combos in sync`];
    return r;
  }
}
