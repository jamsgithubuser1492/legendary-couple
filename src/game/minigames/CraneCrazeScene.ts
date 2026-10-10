import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import { COMMON_FIGURES, RARE_FIGURES, emptyResult, figureOf, type MGResult } from '../../state/minigames';
import { MinigameScene } from './base';

type Phase = 'x' | 'depth' | 'drop' | 'lift' | 'show';
interface Box { id: number; x: number; heavy: boolean; fig: string; taken: boolean }
interface Model {
  phase: Phase;
  tries: number;
  cx: number; // claw x 0..1, controlled by A until locked
  dy: number; // depth 0..1, controlled by B
  dirX: number;
  dirD: number;
  locked: boolean;
  boxes: Box[];
  grabbed: number | null;
  aura: boolean;
  liftT: number;
  lifted: number;
  msg: string;
  won: string[];
  showT: number;
}

const SHELF_Y = 380;
const BX = (x: number) => 130 + x * 700;
const MAX_TRIES = 3;

export class CraneCrazeScene extends MinigameScene {
  constructor() {
    super('CraneCrazeScene');
  }
  protected duration = 0;
  private m!: Model;
  private nextId = 1;
  private t!: Record<string, Phaser.GameObjects.Text>;
  private btn: Record<string, ReturnType<MinigameScene['button']>> = {};

  private stock(): Box[] {
    const boxes: Box[] = [];
    for (let i = 0; i < 6; i++) {
      const rare = Math.random() < 0.15;
      const pool = rare ? RARE_FIGURES : COMMON_FIGURES;
      boxes.push({ id: this.nextId++, x: 0.08 + i * 0.165, heavy: i % 3 === 1 ? true : Math.random() < 0.2, fig: pool[Math.floor(Math.random() * pool.length)], taken: false });
    }
    return boxes;
  }

  protected build() {
    this.nextId = 1;
    this.m = { phase: 'x', tries: 0, cx: 0.05, dy: 0, dirX: 1, dirD: 1, locked: false, boxes: this.stock(), grabbed: null, aura: false, liftT: 0, lifted: 0, msg: '', won: [], showT: 0 };
    const mk = (x: number, y: number, size: number, color = '#6b4f4f') =>
      this.add.text(x, y, '', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: `${size}px`, color, align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5).setDepth(10);
    this.t = { top: mk(480, 26, 22), hint: mk(480, 452, 20), banner: mk(480, 120, 34, '#c2185b') };
    this.exitButton();
    this.btn.lock = this.button(250, 504, 240, 54, 'Lock position', { fill: 0xffd9e2, size: 20, onUp: () => this.act('A', 'lock') });
    this.btn.drop = this.button(710, 504, 240, 54, 'DROP!', { fill: 0xbfe6f2, size: 22, onUp: () => this.act('B', 'drop') });
    this.btn.cheer = this.button(250, 504, 240, 54, '💖 Cheer!', { fill: 0xfff3a0, size: 22, onUp: () => this.act('A', 'cheer') });
    this.btn.cheer.setVisible(false);
  }

  protected hostTick(dt: number) {
    const m = this.m;
    if (m.phase === 'x') {
      m.cx += m.dirX * 0.4 * dt;
      if (m.cx > 0.96) m.dirX = -1;
      if (m.cx < 0.04) m.dirX = 1;
      if (this.isBot('A')) {
        const target = m.boxes.find((b) => !b.taken && !b.heavy);
        if (target && Math.abs(m.cx - target.x) < 0.015) this.onInput('A', 'lock');
      }
    } else if (m.phase === 'depth') {
      m.dy += m.dirD * 0.5 * dt;
      if (m.dy > 1) m.dirD = -1;
      if (m.dy < 0) m.dirD = 1;
      if (this.isBot('B') && m.dy > 0.9) this.onInput('B', 'drop');
    } else if (m.phase === 'lift') {
      m.liftT += dt;
      if (this.isBot('A') && m.liftT > 0.4 && !m.aura) this.onInput('A', 'cheer');
      if (m.liftT >= 1.6) this.resolveLift();
    } else if (m.phase === 'show') {
      m.showT += dt;
      if (m.showT > 2) {
        if (m.tries >= MAX_TRIES) this.end();
        else this.reset();
      }
    }
  }

  private reset() {
    const m = this.m;
    m.phase = 'x';
    m.locked = false;
    m.cx = 0.05;
    m.dirX = 1;
    m.dy = 0;
    m.grabbed = null;
    m.aura = false;
    m.liftT = 0;
    m.msg = '';
    m.showT = 0;
    if (m.boxes.every((b) => b.taken)) m.boxes = this.stock();
  }

  private resolveLift() {
    const m = this.m;
    const box = m.boxes.find((b) => b.id === m.grabbed);
    m.phase = 'show';
    m.showT = 0;
    m.tries++;
    if (box && !box.taken) {
      const slip = box.heavy && !m.aura ? Math.abs(m.cx - box.x) > 0.01 || Math.random() < 0.6 : false;
      if (!slip) {
        box.taken = true;
        m.won.push(box.fig);
        m.msg = `🎁 You got ${figureOf(box.fig)?.name ?? 'a figure'}!`;
        return;
      }
      m.msg = 'It slipped! Heavy boxes need a Cheer and a perfect line up';
      return;
    }
    m.msg = 'Nothing there… try again!';
  }

  protected onInput(from: PlayerId, k: string, _v?: unknown) {
    const m = this.m;
    if (k === 'lock' && m.phase === 'x' && from === 'A') {
      m.phase = 'depth';
      m.locked = true;
    } else if (k === 'drop' && m.phase === 'depth' && from === 'B') {
      m.phase = 'drop';
      const box = m.boxes.find((b) => !b.taken && Math.abs(b.x - m.cx) < (b.heavy ? 0.03 : 0.065));
      const deep = m.dy > 0.78;
      m.grabbed = box && deep ? box.id : null;
      m.phase = 'lift';
      m.liftT = 0;
    } else if (k === 'cheer' && m.phase === 'lift' && from === 'A') {
      m.aura = true;
    }
  }

  protected snapshot() {
    return { clock: this.clock, m: this.m };
  }
  protected applySnapshot(s: unknown) {
    this.m = (s as { m: Model }).m;
  }

  protected draw() {
    const m = this.m, g = this.g, me = this.role;
    g.clear();
    // arcade cabinet
    g.fillStyle(0xe8d6f5, 1);
    g.fillRect(-2000, -200, 5000, 3000);
    g.fillStyle(0xbfe6f2, 0.5);
    g.fillRoundedRect(90, 60, 780, 360, 20);
    g.fillStyle(0xffd9e2, 1);
    g.fillRect(90, SHELF_Y + 24, 780, 18);
    g.lineStyle(4, 0xffffff, 0.9);
    g.strokeRoundedRect(90, 60, 780, 360, 20);
    // boxes
    for (const b of m.boxes) {
      if (b.taken) continue;
      const x = BX(b.x), s = b.heavy ? 56 : 44;
      g.fillStyle(b.heavy ? 0xb88adf : 0xff9ebb, 1);
      g.fillRoundedRect(x - s / 2, SHELF_Y + 24 - s, s, s, 8);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(x - 3, SHELF_Y + 24 - s, 6, s);
      g.fillRect(x - s / 2, SHELF_Y + 24 - s / 2 - 3, s, 6);
      if (b.heavy) {
        g.fillStyle(0x6b4f4f, 1);
        g.fillRect(x - 8, SHELF_Y + 24 - s + 10, 16, 4);
      }
    }
    // claw
    const x = BX(m.cx);
    let y = 96;
    if (m.phase === 'depth') y = 96 + m.dy * (SHELF_Y - 96 - 40);
    else if (m.phase === 'lift') y = 96 + m.dy * (SHELF_Y - 96 - 40) * Math.max(0, 1 - m.liftT / 1.5);
    else if (m.phase === 'show') y = 96;
    g.lineStyle(3, 0x6b4f4f, 1);
    g.beginPath();
    g.moveTo(x, 62);
    g.lineTo(x, y);
    g.strokePath();
    if (m.aura && m.phase === 'lift') {
      g.fillStyle(0xfff3a0, 0.5);
      g.fillCircle(x, y + 20, 50);
    }
    g.fillStyle(0x6b4f4f, 1);
    g.fillRoundedRect(x - 16, y, 32, 14, 6);
    const open = m.phase === 'lift' || m.phase === 'show' ? 6 : 18;
    g.lineStyle(5, 0x6b4f4f, 1);
    g.beginPath();
    g.moveTo(x - 14, y + 12);
    g.lineTo(x - open, y + 34);
    g.moveTo(x + 14, y + 12);
    g.lineTo(x + open, y + 34);
    g.strokePath();
    if (m.phase === 'lift' && m.grabbed) {
      const b = m.boxes.find((q) => q.id === m.grabbed);
      if (b) {
        g.fillStyle(b.heavy ? 0xb88adf : 0xff9ebb, 1);
        g.fillRoundedRect(x - 20, y + 30, 40, 40, 8);
      }
    }
    // depth guide for B
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(880, 80, 14, 300, 7);
    g.fillStyle(0xff7fa1, 1);
    g.fillCircle(887, 80 + m.dy * 300, 10);

    this.t.top.setText(`Tries ${Math.min(m.tries + (m.phase === 'show' ? 0 : 1), MAX_TRIES)} / ${MAX_TRIES}      🎁 ${m.won.length}`);
    this.t.banner.setText(m.phase === 'show' ? m.msg : '');
    let hint = '';
    if (m.phase === 'x') hint = me === 'A' ? 'Lock the claw when it is over a box' : `${this.name('A')} lines up the claw…`;
    else if (m.phase === 'depth') hint = me === 'B' ? 'DROP when the claw is low!' : `${this.name('B')} times the drop…`;
    else if (m.phase === 'lift') hint = me === 'A' ? 'Tap Cheer to add a magnetic aura!' : 'Lifting…';
    this.t.hint.setText(hint);
    this.btn.lock.setVisible(m.phase !== 'lift' && me === 'A');
    this.btn.lock.setEnabled(m.phase === 'x');
    this.btn.cheer.setVisible(m.phase === 'lift' && me === 'A');
    this.btn.drop.setVisible(me === 'B');
    this.btn.drop.setEnabled(m.phase === 'depth');
  }

  protected result(): MGResult {
    const r = emptyResult('CRANE_CRAZE');
    r.figures = [...this.m.won];
    r.score = this.m.won.length * 100;
    r.notes = [this.m.won.length ? 'Shelve them or set them free to roam the island' : 'No luck this time, try another token'];
    return r;
  }
}
void Phaser;
