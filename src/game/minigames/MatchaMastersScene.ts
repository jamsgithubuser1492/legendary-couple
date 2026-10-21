import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import { CAFE_DECOR, emptyResult, RECIPES, type MGResult } from '../../state/minigames';
import { getState } from '../../state/store';
import { drinkOf, pastryName } from '../../state/cafe';
import { FONT, MinigameScene, coverBox, fitBox } from './base';

interface Order { id: number; name: string; recipe: string[]; patience: number; combo: boolean; claimed: boolean; face: string; pastry?: string; pastryOnly?: boolean; cafeId?: string }
interface Model {
  orders: Order[];
  counter: string[];
  pass: { orderId: number } | null;
  stage: 'idle' | 'meter' | 'steps' | 'plate' | 'serve';
  meterT0: number;
  band: { c: number; w: number };
  quality: number;
  layers: string[]; // the order the barista layers the drink in
  tray: string[]; // the ingredients on the barista's tray, shuffled, with one decoy
  stepIdx: number;
  score: number;
  mult: number;
  served: number;
  missed: number;
  perfect: number;
  combos: number;
  lastTip: number;
  tips: number;
  combo: { deadline: number; taps: { A?: boolean; B?: boolean } } | null;
  flash: { text: string; until: number } | null;
  filled: { id: string; tip: number; perfect: boolean }[]; // café orders served this rush
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
const PATIENCE_SECONDS = 36; // still kinder than a real rush, but now there is a little pressure
/** The barista layers a drink from the bottom up in this order, so both of you can read it off the ticket. */
const LAYER_ORDER = ['Ice', 'Strawberry', 'Oat Milk', 'Milk', 'Espresso', 'Matcha', 'Boba'];
const layered = (recipe: string[]) => [...recipe].sort((a, b) => LAYER_ORDER.indexOf(a) - LAYER_ORDER.indexOf(b));
const ICON = Object.fromEntries(ING) as Record<string, string>;
const trayPos = (i: number, n: number) => ({ x: 714 + (i - (n - 1) / 2) * 82, y: 372 });

export class MatchaMastersScene extends MinigameScene {
  constructor() {
    super('MatchaMastersScene');
  }
  protected duration = 100;
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
  private jar?: Phaser.GameObjects.Image;
  private lastTips = 0;
  private startMult = 1;
  private sous: PlayerId = 'A';
  private bar: PlayerId = 'B';
  private endAt = 0;
  private get rush() { return !!this.cfg.rush; }

  private fresh(): Model {
    return { orders: [], counter: [], pass: null, stage: 'idle', meterT0: 0, band: { c: 0.5, w: 0.2 }, quality: 1, layers: [], tray: [], stepIdx: 0, score: 0, mult: this.startMult, served: 0, missed: 0, perfect: 0, combos: 0, lastTip: 0, tips: 0, combo: null, flash: null, filled: [] };
  }

  private meterPos(): number {
    return 0.5 + 0.5 * Math.sin((this.clock - this.m.meterT0) * 2.6 - Math.PI / 2);
  }

  protected build() {
    this.startMult = 1 + Math.min(0.5, getState().ingredients * 0.05); // a stocked pantry gives a head start
    this.sous = this.cfg.swap ? 'B' : 'A';
    this.bar = this.cfg.swap ? 'A' : 'B';
    this.endAt = 0;
    this.m = this.fresh();
    if (this.rush) this.m.orders = this.rushOrders();
    this.nextSpawn = 0.5;
    this.nextId = 1;
    this.botPlan = [];
    this.botT = 0;
    this.lastEnabled = '';
    this.cards = [];
    this.stepImgs = {};
    this.jar = undefined;
    this.lastTips = 0;
    this.stepLabels = {};
    const mk = (x: number, y: number, size: number, color = '#6b4f4f', ox = 0.5, oy = 0.5) =>
      this.add.text(x, y, '', { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', wordWrap: { width: 400 } }).setOrigin(ox, oy).setDepth(10);
    for (let i = 0; i < 4; i++) {
      const x = 30 + i * 229;
      this.cards.push({
        name: this.add.text(x + 105, 28, '', { fontFamily: FONT, fontSize: '15px', color: '#6b4f4f', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5, 0).setDepth(10),
        recipe: this.add.text(x + 105, 66, '', { fontFamily: FONT, fontSize: '11px', color: '#8a6b6b', align: 'center', wordWrap: { width: 200 } }).setOrigin(0.5, 0).setDepth(10),
        hearts: this.add.text(x + 105, 104, '', { fontFamily: FONT, fontSize: '18px', color: '#ff7fa1' }).setOrigin(0.5, 0).setDepth(10),
      });
    }
    this.t = {
      score: mk(24, 150, 24, '#6b4f4f', 0, 0),
      mult: mk(480, 135, 20, '#a05a7a'),
      time: mk(936, 150, 24, '#6b4f4f', 1, 0),
      tips: mk(826, 160, 16, '#a05a7a', 1, 0.5),
      aTitle: mk(246, 160, 20, '#a05a7a'),
      bTitle: mk(714, 160, 20, '#a05a7a'),
      counter: mk(246, 292, 16),
      bState: mk(714, 232, 17),
      banner: mk(480, 300, 38, '#d9628a'),
    };
    // Partner A: sous chef
    ING.forEach(([name, icon], i) => {
      const x = 80 + (i % 4) * 112, y = 212 + Math.floor(i / 4) * 54;
      this.btn[`ing:${name}`] = this.button(x, y, 104, 46, `\u2003\u2003${name}`, { size: 13, onDown: () => this.act(this.sous, 'add', name) });
      if (this.textures.exists(`mg_ing_${icon}`)) fitBox(this.add.image(x - 38, y, `mg_ing_${icon}`).setDepth(25), 32, 38);
    });
    if (this.textures.exists('mg_bg_matcha')) {
      // the painted counter scene, shown as it was drawn: the panels above are see through so it stays visible
      coverBox(this.add.image(480, 270, 'mg_bg_matcha').setDepth(-90), 960, 540);
      this.add.rectangle(480, 270, 960, 540, 0xfff3e8, 0.08).setDepth(-80);
      this.hasBg = true;
    } else if (this.textures.exists('mg_bg_cafe_day')) {
      coverBox(this.add.image(480, 270, 'mg_bg_cafe_day').setDepth(-90), 960, 540);
      this.add.rectangle(480, 270, 960, 540, 0xfff3e8, 0.4).setDepth(-80);
      this.hasBg = true;
    }
    if (this.textures.exists('mg_rush_badge')) fitBox(this.add.image(372, 135, 'mg_rush_badge').setDepth(11), 26, 26);
    this.cardImgs = [0, 1, 2, 3].map((i) => fitBox(this.add.image(30 + i * 229 + 184, 122, 'mg_cust_1').setOrigin(0.5, 1).setDepth(11).setVisible(false), 34, 56));
    if (this.textures.exists('mg_tipjar')) this.jar = fitBox(this.add.image(846, 160, 'mg_tipjar').setDepth(12), 32, 40);
    this.drinkImg = fitBox(this.add.image(714, 330, 'mg_cup_1').setDepth(12).setVisible(false), 96, 90);
    this.btn.clear = this.button(100, 468, 100, 44, 'Clear', { fill: 0xe8e0f0, onDown: () => this.act(this.sous, 'clear') });
    this.btn.pass = this.button(330, 468, 180, 44, 'Pass to barista ➜', { fill: 0xbfe8b0, size: 17, onDown: () => this.act(this.sous, 'pass') });
    this.btn.plate = this.button(330, 468, 200, 44, 'Plate it 🥐', { fill: 0xffd9e2, size: 17, onDown: () => this.act(this.sous, 'plate') });
    this.btn.plate.setVisible(false);
    // Partner B: barista
    this.btn.steam = this.button(714, 410, 200, 56, '♨ Steam!', { fill: 0xffd23f, size: 24, onDown: () => this.act(this.bar, 'meter', this.meterPos()) });
    this.btn.serve = this.button(714, 410, 200, 56, 'Serve ✓', { fill: 0xbfe8b0, size: 24, onDown: () => this.act(this.bar, 'serve') });
    // couples combo cheer, for both
    this.btn.cheer = this.button(480, 380, 220, 70, '💞 CHEER!', { fill: 0xff9fbd, size: 30, onDown: () => this.act(this.role, 'cheer') });
    this.btn.cheer.setVisible(false);
    this.exitButton();
    // tap the ingredient that is next in the layer order
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const m = this.m;
      if (m.stage !== 'steps' || !this.can(this.bar)) return;
      m.tray.forEach((name, i) => {
        const t = trayPos(i, m.tray.length);
        if (Math.abs(p.worldX - t.x) < 38 && Math.abs(p.worldY - t.y) < 44) this.act(this.bar, 'step', name);
      });
    });
  }

  /** The orders your guests placed: up to four that one of you has taken from the ticket rail. */
  private rushOrders(): Order[] {
    const list = getState().cafe.orders.filter((o) => o.by).slice(0, 4);
    return list.map((o, i) => {
      const d = drinkOf(o.drink);
      return { id: this.nextId++, name: d?.name ?? pastryName(o.pastry), recipe: d ? [...d.recipe] : [], patience: 1, combo: false, claimed: false, face: FACES[i % FACES.length], pastry: o.pastry ? pastryName(o.pastry) : undefined, pastryOnly: !d, cafeId: o.id };
    });
  }

  // ---------- host simulation ----------
  protected hostTick(dt: number) {
    const m = this.m, c = this.clock;
    if (!this.rush) for (const o of m.orders) o.patience -= dt / PATIENCE_SECONDS; // a café rush has no timers: nobody storms out
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
    if (this.rush) {
      if (!m.orders.length && m.stage === 'idle' && !m.pass) {
        if (!this.endAt) this.endAt = c + 1.8;
        else if (c > this.endAt) { this.end(); return; }
      }
    } else if (c >= this.nextSpawn && m.orders.length < 4) {
      const d = MENU[Math.floor(Math.random() * MENU.length)];
      m.orders.push({ id: this.nextId++, name: d.name, recipe: d.recipe, patience: 1, combo: !!d.combo, claimed: false, face: FACES[Math.floor(Math.random() * FACES.length)] });
      this.nextSpawn = c + 7 + Math.random() * 3;
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
    if (this.isBot(this.sous) && (!m.pass || m.stage === 'plate')) {
      if (m.stage === 'plate') { this.onInput(this.sous, 'plate'); this.botT = 0.8; return; }
      if (this.botPlan.length === 0 && m.counter.length === 0) {
        const o = m.orders.find((x) => !x.claimed && x.recipe.length);
        if (o) this.botPlan = [...o.recipe];
        else if (m.orders.some((x) => !x.claimed && x.pastryOnly)) { this.onInput(this.sous, 'plate'); this.botT = 0.9; return; }
      }
      if (this.botPlan.length) { this.onInput(this.sous, 'add', this.botPlan.shift()); this.botT = 0.8; if (!this.botPlan.length) this.botT = 0.6; }
      else if (m.counter.length) { this.onInput(this.sous, 'pass'); this.botT = 0.9; }
    }
    if (this.isBot(this.bar)) {
      if (m.stage === 'meter' && Math.abs(this.meterPos() - m.band.c) < 0.07) { this.onInput(this.bar, 'meter', this.meterPos()); this.botT = 0.7; }
      else if (m.stage === 'steps') { this.onInput(this.bar, 'step', m.layers[m.stepIdx]); this.botT = 0.85; }
      else if (m.stage === 'serve') { this.onInput(this.bar, 'serve'); this.botT = 0.9; }
    }
  }

  protected onInput(from: PlayerId, k: string, v?: unknown) {
    const m = this.m, c = this.clock;
    if (k === 'add' && from === this.sous && m.counter.length < 4) m.counter.push(v as string);
    else if (k === 'clear' && from === this.sous) m.counter = [];
    else if (k === 'plate' && from === this.sous) {
      if (m.stage === 'plate') m.stage = 'serve';
      else if (m.stage === 'idle' && !m.pass) {
        const o = m.orders.find((x) => !x.claimed && x.pastryOnly);
        if (o) { o.claimed = true; m.pass = { orderId: o.id }; m.quality = 1; m.stage = 'serve'; }
      }
    }
    else if (k === 'pass' && from === this.sous && !m.pass && m.counter.length) {
      const o = m.orders.find((x) => !x.claimed && sameSet(x.recipe, m.counter));
      if (o) {
        o.claimed = true;
        m.pass = { orderId: o.id };
        m.stage = 'meter';
        m.meterT0 = c;
        m.band = { c: 0.25 + Math.random() * 0.5, w: 0.2 };
      } else {
        m.score = Math.max(0, m.score - 3);
        m.flash = { text: 'Wrong mix! −3', until: c + 1.2 };
      }
      m.counter = [];
      this.botPlan = [];
    } else if (k === 'meter' && from === this.bar && m.stage === 'meter') {
      const d = Math.abs((v as number) - m.band.c); // judged on the barista's own screen, so lag does not cost them
      m.quality = d <= m.band.w / 2 ? 1 : d <= m.band.w ? 0.65 : 0.35;
      const ord = m.orders.find((x) => x.id === m.pass?.orderId);
      m.layers = layered(ord?.recipe ?? []);
      const decoys = ING.map((x) => x[0]).filter((n) => !m.layers.includes(n));
      const tray = [...m.layers, decoys[Math.floor(Math.random() * decoys.length)]];
      for (let i = tray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tray[i], tray[j]] = [tray[j], tray[i]];
      }
      m.tray = tray;
      m.stepIdx = 0;
      m.stage = 'steps';
    } else if (k === 'step' && from === this.bar && m.stage === 'steps') {
      if (v === m.layers[m.stepIdx]) {
        m.stepIdx++;
        if (m.stepIdx >= m.layers.length) m.stage = m.orders.find((x) => x.id === m.pass?.orderId)?.pastry ? 'plate' : 'serve';
      } else {
        m.quality = Math.max(0.3, m.quality - 0.18); // a wrong layer is a small slip, not a disaster
        m.flash = { text: `Not yet: ${m.layers[m.stepIdx]} comes next`, until: c + 1.4 };
      }
    } else if (k === 'serve' && from === this.bar && m.stage === 'serve') {
      const o = m.orders.find((x) => x.id === m.pass?.orderId);
      m.pass = null;
      m.stage = 'idle';
      if (!o) return;
      const tip = Math.round(m.quality * (10 + (o.pastry ? 6 : 0)) * m.mult * (0.5 + 0.5 * Math.max(0, o.patience)));
      if (o.cafeId) m.filled.push({ id: o.cafeId, tip, perfect: m.quality === 1 });
      m.score += 10 + tip;
      m.lastTip = tip;
      m.tips += tip;
      m.served++;
      if (m.quality === 1) m.perfect++;
      m.mult = Math.min(3, m.mult + 0.25);
      m.orders = m.orders.filter((x) => x.id !== o.id);
      m.flash = { text: `+${10 + tip}`, until: c + 1 };
      if (o.combo) m.combo = { deadline: c + 2.4, taps: {} };
    } else if (k === 'cheer' && m.combo) {
      m.combo.taps[from] = true;
      if (m.combo.taps.A && m.combo.taps.B) {
        m.score += m.lastTip; // double the tip
      m.tips += m.lastTip;
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
    g.fillStyle(0xf6dcc8, this.hasBg ? 0.12 : 1);
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
      this.cards[i].recipe.setText([layered(o.recipe).join(' → '), o.pastry && !o.pastryOnly ? `+ ${o.pastry}` : ''].filter(Boolean).join('  '));
      this.cards[i].hearts.setText('♥'.repeat(hearts) + '♡'.repeat(5 - hearts)).setColor(hearts <= 1 ? '#e8503a' : '#ff7fa1');
    }
    // panels
    this.panel(24, 140, 444, 388, 0xffffff, me === this.sous ? 0.9 : 0.58);
    this.panel(492, 140, 444, 388, 0xffffff, me === this.bar ? 0.9 : 0.58);
    // A: counter slots
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0xf3e6d8, 1);
      g.fillRoundedRect(60 + i * 96, 322, 86, 46, 10);
    }
    const slotText = m.counter.map((n) => ING.find((x) => x[0] === n)?.[1] ?? '?');
    const plateFor = m.orders.find((x) => x.id === m.pass?.orderId);
    const plateNow = (m.stage === 'plate' && !!plateFor) || (m.stage === 'idle' && !m.pass && m.orders.some((x) => !x.claimed && x.pastryOnly));
    this.t.counter.setPosition(246, 396).setText(m.stage === 'plate' && plateFor ? `Plate the ${plateFor.pastry} 🥐` : m.counter.length ? m.counter.join(' + ') : plateNow ? 'A pastry is waiting to be plated' : 'Prep counter is empty');
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
    } else if (m.stage === 'steps') {
      bLine = `Layer it in order: ${Math.min(m.stepIdx + 1, m.layers.length)} of ${m.layers.length}. Tap ${m.layers[m.stepIdx] ?? ''}`;
      // the recipe, bottom to top, so you can follow it
      m.layers.forEach((name, i) => {
        const x = 714 + (i - (m.layers.length - 1) / 2) * 82, y = 300;
        const done = i < m.stepIdx, next = i === m.stepIdx;
        g.fillStyle(done ? 0xbfe8b0 : next ? 0xffd9e2 : 0xf3e6d8, 1);
        g.fillRoundedRect(x - 36, y - 26, 72, 52, 12);
        if (next) {
          g.lineStyle(3, 0xff7fa1, 1);
          g.strokeRoundedRect(x - 36, y - 26, 72, 52, 12);
        }
        const k = `layer${i}`;
        if (!this.stepImgs[k]) this.stepImgs[k] = this.add.image(0, 0, `mg_ing_${ICON[name] ?? 'matcha'}`).setDepth(12);
        const im = this.stepImgs[k].setTexture(`mg_ing_${ICON[name] ?? 'matcha'}`).setPosition(x, y).setVisible(true).setAlpha(done ? 0.45 : 1);
        fitBox(im, 40, 44);
        if (!this.stepLabels[k]) this.stepLabels[k] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', color: '#6b4f4f' }).setOrigin(0.5).setDepth(13);
        this.stepLabels[k].setPosition(x - 26, y - 20).setText(done ? '✓' : `${i + 1}`).setVisible(true);
      });
      // the tray: tap the next ingredient
      m.tray.forEach((name, i) => {
        const t = trayPos(i, m.tray.length);
        const k = `tray${i}`;
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(t.x - 36, t.y - 42, 72, 84, 14);
        g.lineStyle(2, 0xe8d6c8, 1);
        g.strokeRoundedRect(t.x - 36, t.y - 42, 72, 84, 14);
        if (!this.stepImgs[k]) this.stepImgs[k] = this.add.image(0, 0, `mg_ing_${ICON[name] ?? 'matcha'}`).setDepth(12);
        const im = this.stepImgs[k].setTexture(`mg_ing_${ICON[name] ?? 'matcha'}`).setPosition(t.x, t.y - 8).setVisible(true).setAlpha(1);
        fitBox(im, 50, 54);
        if (!this.stepLabels[k]) this.stepLabels[k] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: '#6b4f4f' }).setOrigin(0.5).setDepth(13);
        this.stepLabels[k].setPosition(t.x, t.y + 32).setText(name).setVisible(true);
      });
    } else if (m.stage === 'plate') bLine = `Waiting for the Sous Chef to plate the ${m.orders.find((x) => x.id === m.pass?.orderId)?.pastry ?? 'pastry'}`;
    else if (m.stage === 'serve') bLine = 'Looks lovely! Serve it';
    if (m.stage !== 'steps') {
      Object.values(this.stepImgs).forEach((i) => i.setVisible(false));
      Object.values(this.stepLabels).forEach((l) => l.setVisible(false));
    } else {
      // hide pooled pieces that this order does not use
      for (let i = m.layers.length; i < 6; i++) { this.stepImgs[`layer${i}`]?.setVisible(false); this.stepLabels[`layer${i}`]?.setVisible(false); }
      for (let i = m.tray.length; i < 7; i++) { this.stepImgs[`tray${i}`]?.setVisible(false); this.stepLabels[`tray${i}`]?.setVisible(false); }
    }
    if (this.drinkImg) {
      const show = (m.stage === 'serve' || m.stage === 'steps') && !!m.pass;
      this.drinkImg.setVisible(show && this.textures.exists('mg_cup_1'));
      if (show) fitBox(this.drinkImg.setTexture(`mg_cup_${((m.pass!.orderId - 1) % 8) + 1}`), m.stage === 'serve' ? 96 : 76, m.stage === 'serve' ? 90 : 70).setPosition(m.stage === 'serve' ? 714 : 556, m.stage === 'serve' ? 330 : 236);
    }
    if (m.stage === 'steps') this.t.bState.setOrigin(0, 0.5).setPosition(616, 228).setWordWrapWidth(300);
    else this.t.bState.setOrigin(0.5, 0.5).setPosition(714, 232).setWordWrapWidth(400);
    this.t.bState.setText(bLine);
    // text
    this.t.score.setText(`⭐ ${m.score}`);
    this.t.tips.setText(`${m.tips}`);
    if (this.jar && m.tips > this.lastTips) {
      this.tweens.add({ targets: this.jar, scale: this.jar.scale * 1.3, duration: 120, yoyo: true }); // a tip drops in
    }
    this.lastTips = m.tips;
    this.t.mult.setText(`Café Rush ×${m.mult.toFixed(2)}`);
    this.t.time.setText(`${Math.max(0, Math.ceil(this.duration - c))}s`);
    this.t.aTitle.setText(`🧑 ${this.name(this.sous)}: Sous Chef`);
    this.t.bTitle.setText(`👩 ${this.name(this.bar)}: Barista`);
    this.t.banner.setText(m.flash?.text ?? '');
    // buttons follow the roles and the stage
    const comboOpen = !!m.combo;
    const enabled = `${me}${m.stage}${m.counter.length}${m.pass ? 1 : 0}${comboOpen}${plateNow ? 1 : 0}`;
    if (enabled !== this.lastEnabled) {
      this.lastEnabled = enabled;
      const a = this.can(this.sous), b = this.can(this.bar);
      for (const [name] of ING) this.btn[`ing:${name}`].setEnabled(a && m.counter.length < 4);
      this.btn.clear.setEnabled(a && m.counter.length > 0);
      this.btn.pass.setVisible(!plateNow);
      this.btn.pass.setEnabled(a && m.counter.length > 0 && !m.pass);
      this.btn.plate.setVisible(plateNow);
      this.btn.plate.setEnabled(a && plateNow);
      this.btn.steam.setVisible(m.stage === 'idle' || m.stage === 'meter');
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
  private stepImgs: Record<string, Phaser.GameObjects.Image> = {};
  private stepLabels: Record<string, Phaser.GameObjects.Text> = {};

  protected result(): MGResult {
    const m = this.m;
    const r = emptyResult('MATCHA_MASTERS');
    r.score = m.score;
    r.coins = m.score;
    r.stars = m.score >= 230 ? 3 : m.score >= 140 ? 2 : m.score >= 60 ? 1 : 0;
    const have = getState().recipes;
    if (r.stars >= 3) {
      const next = RECIPES.find((x) => !have.includes(x));
      if (next) r.recipes = [next];
      const decor = CAFE_DECOR[Math.min(have.length, CAFE_DECOR.length - 1)];
      r.items = [decor];
    }
    r.rush = this.rush;
    r.cafeServed = m.filled;
    r.notes = [`${m.served} served, ${m.perfect} perfect, ${m.missed} left unhappy`, `${m.combos} Couples Combos in sync`];
    return r;
  }
}
