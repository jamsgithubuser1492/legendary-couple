import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import type { MGResult } from '../../state/minigames';
import type { MinigameNet } from './net';
import { DPR } from '../render';

export const W = 960;
export const H = 540;
const MAX_FIT = 1.6;
export const FONT = '"Baloo 2", system-ui, sans-serif';
export const BOT_NAME = 'Mochi';

export interface MGInit {
  role: PlayerId; // which partner this device plays
  solo: boolean; // practice against the Mochi bot
  net: MinigameNet | null;
  names: Record<PlayerId, string>;
  rush: boolean; // a café rush: orders come from your guests
  swap: boolean; // roles swapped: partner B is the Sous Chef
  onDone: (r: MGResult) => void;
  onQuit: () => void;
}

const SEND_EVERY = 1 / 30; // 30 snapshots per second

/**
 * Shared base for every minigame.
 *  * Authority: partner A's device is the host. It runs the simulation and broadcasts a snapshot 30 times a second.
 *  * Prediction: partner B applies its own inputs immediately (predict) and sends them to the host, so controls never feel laggy.
 *  * Solo: the other partner is the Mochi bot, driven by the host.
 */
export abstract class MinigameScene extends Phaser.Scene {
  protected cfg!: MGInit;
  protected role: PlayerId = 'A';
  protected host = true;
  protected solo = true;
  protected clock = 0; // host time in seconds, advanced locally by every client and corrected by snapshots
  protected finished = false;
  protected abstract duration: number; // seconds, 0 for endless
  protected g!: Phaser.GameObjects.Graphics;
  private partnerHere = false;
  private sendAcc = 0;
  private helloTimer?: ReturnType<typeof setInterval>;
  private waitText?: Phaser.GameObjects.Text;
  private offNet?: () => void;
  private escAt = 0;
  private paused = false; // a solo game waits while the window is in the background
  private pausedText?: Phaser.GameObjects.Text;
  private escText?: Phaser.GameObjects.Text;
  /** A mouse and keyboard machine (not a phone): key hints are shown only here. */
  protected desktop = (() => { try { return window.matchMedia('(pointer: fine)').matches; } catch { return false; } })();

  init(data: MGInit) {
    this.cfg = data;
    this.role = data.role;
    this.solo = data.solo;
    this.host = data.solo || data.role === 'A';
    this.clock = 0;
    this.finished = false;
    this.partnerHere = data.solo;
    this.sendAcc = 0;
  }

  create() {
    this.add.rectangle(-4000, -4000, 9000, 9000, 0xfff3e8).setOrigin(0, 0).setDepth(-100);
    this.fit();
    this.scale.on('resize', this.fit, this);
    this.g = this.add.graphics().setDepth(1);
    this.waitText = this.add.text(W / 2, H / 2, '', { fontFamily: FONT, fontSize: '28px', color: '#6b4f4f', align: 'center' }).setOrigin(0.5).setDepth(50);
    this.build();
    this.input.keyboard?.on('keydown-ESC', () => this.onEscape());
    const net = this.cfg.net;
    if (net) {
      this.offNet = net.on((m) => this.onNet(m));
      if (!this.host) {
        // keep saying hello on a real clock until the host answers, so the order the two phones start in never matters
        net.send('hello');
        this.helloTimer = setInterval(() => {
          if (!this.partnerHere && !this.finished) net.send('hello');
        }, 500);
      }
    }
    // a solo game (just you and Mochi) waits when you switch to another window, so nothing is ever missed. With a
    // partner it keeps running, because their game cannot wait for yours.
    const away = () => {
      if (!this.solo || this.finished || this.paused) return;
      this.paused = true;
      this.pausedText?.destroy();
      this.pausedText = this.add.text(W / 2, H / 2, 'Paused. Come back when you are ready.', { fontFamily: FONT, fontSize: '26px', color: '#6b4f4f', backgroundColor: '#fff8eef0', padding: { x: 18, y: 10 } }).setOrigin(0.5).setDepth(95);
    };
    const back = () => {
      if (!this.paused) return;
      this.paused = false;
      this.pausedText?.destroy();
      this.pausedText = undefined;
    };
    window.addEventListener('blur', away);
    window.addEventListener('focus', back);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur', away);
      window.removeEventListener('focus', back);
      this.scale.off('resize', this.fit, this);
      this.offNet?.();
      clearInterval(this.helloTimer);
    });
  }

  /** Esc asks once, and leaves on a second press: a stray key never throws your game away. */
  protected onEscape() {
    if (this.finished) return;
    const now = this.time.now;
    if (now - this.escAt < 2200) return this.quit();
    this.escAt = now;
    this.escText?.destroy();
    this.escText = this.add.text(W / 2, 62, 'Press Esc again to leave', { fontFamily: FONT, fontSize: '18px', color: '#6b4f4f', backgroundColor: '#fff8eec8', padding: { x: 12, y: 5 } }).setOrigin(0.5).setDepth(90);
    this.time.delayedCall(2200, () => this.escText?.destroy());
  }

  /**
   * Runs fn when one of these keys goes down (a held key does not repeat). Ignored when a text box has focus or the game
   * is over. Keys are event.key values such as ' ', 'Enter', '1' or 'ArrowLeft'.
   */
  protected onKey(keys: string | string[], fn: (e: KeyboardEvent) => void, up?: (e: KeyboardEvent) => void) {
    const list = Array.isArray(keys) ? keys : [keys];
    const typing = () => { const a = document.activeElement as HTMLElement | null; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable); };
    const kd = (e: KeyboardEvent) => {
      if (this.finished || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing() || !list.includes(e.key)) return;
      e.preventDefault();
      fn(e);
    };
    this.input.keyboard?.on('keydown', kd);
    const ku = (e: KeyboardEvent) => { if (!this.finished && up && list.includes(e.key)) up(e); };
    if (up) this.input.keyboard?.on('keyup', ku);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.input.keyboard?.off('keydown', kd); this.input.keyboard?.off('keyup', ku); });
  }

  /** A key hint for the hint bar, only on a mouse and keyboard machine. */
  protected keyHint(text: string): string {
    return this.desktop ? text : '';
  }

  private fit() {
    const cam = this.cameras.main;
    // fills the window, but never grows past 1.6 times (css pixels), so art stays crisp and the layout stays calm
    cam.setZoom(Math.min(cam.width / W, cam.height / H, MAX_FIT * DPR));
    cam.centerOn(W / 2, H / 2);
  }

  /**
   * Carries a painted backdrop past its edges on wide or tall windows: a mirrored copy on each side (so the scenery
   * flows on instead of stretching), and the outermost row and column of pixels stretched beyond that and above and
   * below. (x, y, w, h) is where the picture is drawn, in game units.
   */
  protected extendBackdrop(key: string, x: number, y: number, w: number, h: number, depth: number): Phaser.GameObjects.Image[] {
    const tex = this.textures.get(key);
    const src = tex.getSourceImage() as { width: number; height: number };
    const tw = src.width, th = src.height, BIG = 4000;
    const frame = (n: string, fx: number, fy: number, fw: number, fh: number) => {
      const name = `edge_${n}`;
      if (!tex.has(name)) tex.add(name, 0, fx, fy, fw, fh);
      return name;
    };
    const put = (n: string, fx: number, fy: number, fw: number, fh: number, ix: number, iy: number, ox: number, oy: number, dw: number, dh: number, flip = false) =>
      this.add.image(ix, iy, key, frame(n, fx, fy, fw, fh)).setOrigin(ox, oy).setDisplaySize(dw, dh).setFlipX(flip).setDepth(depth);
    const out: Phaser.GameObjects.Image[] = [];
    for (const k of [-1, 1]) out.push(put('all', 0, 0, tw, th, x + k * w, y, 0, 0, w, h, true)); // mirrored neighbours
    for (const k of [-1, 0, 1]) {
      const flip = k !== 0;
      out.push(put('t', 0, 0, tw, 1, x + k * w, y, 0, 1, w, BIG, flip), put('b', 0, th - 1, tw, 1, x + k * w, y + h, 0, 0, w, BIG, flip));
    }
    out.push(
      put('r', tw - 1, 0, 1, th, x - w, y, 1, 0, BIG, h), // beyond the mirrored copies: the mirror's outer edge, stretched
      put('l', 0, 0, 1, th, x + 2 * w, y, 0, 0, BIG, h),
      put('tr', tw - 1, 0, 1, 1, x - w, y, 1, 1, BIG, BIG),
      put('tl', 0, 0, 1, 1, x + 2 * w, y, 0, 1, BIG, BIG),
      put('br', tw - 1, th - 1, 1, 1, x - w, y + h, 1, 0, BIG, BIG),
      put('bl', 0, th - 1, 1, 1, x + 2 * w, y + h, 0, 0, BIG, BIG),
    );
    return out;
  }

  // ---------- networking ----------
  private onNet(m: { t: string; p?: unknown; from: PlayerId }) {
    if (this.finished) return;
    if (m.t === 'hello' && this.host) {
      this.partnerHere = true;
      this.cfg.net?.send('snap', this.snapshot());
    } else if (m.t === 'snap' && !this.host) {
      const s = m.p as { clock: number };
      this.partnerHere = true;
      if (Math.abs(s.clock - this.clock) > 0.12) this.clock = s.clock;
      else this.clock += (s.clock - this.clock) * 0.35;
      this.applySnapshot(m.p);
    } else if (m.t === 'in' && this.host) {
      const i = m.p as { k: string; v: unknown };
      this.onInput(m.from, i.k, i.v);
    } else if (m.t === 'end' && !this.host) {
      this.finish(m.p as MGResult);
    } else if (m.t === 'bye') {
      this.quit();
    }
  }

  /** An input from partner `role`. The host applies it, a guest predicts it locally and sends it to the host. */
  protected act(role: PlayerId, k: string, v?: unknown) {
    if (this.finished) return;
    if (this.host) this.onInput(role, k, v);
    else {
      this.predict(k, v);
      this.cfg.net?.send('in', { k, v });
    }
  }

  protected isBot(role: PlayerId): boolean {
    return this.solo && role !== this.role;
  }
  protected can(role: PlayerId): boolean {
    return role === this.role;
  }
  protected name(role: PlayerId): string {
    return this.isBot(role) ? BOT_NAME : this.cfg.names[role];
  }

  // ---------- what each game provides ----------
  protected abstract build(): void;
  protected abstract hostTick(dt: number): void; // host only: simulate
  protected abstract onInput(from: PlayerId, k: string, v: unknown): void; // host only
  protected predict(_k: string, _v: unknown): void {} // guest only: apply my own input instantly
  protected abstract snapshot(): { clock: number } & Record<string, unknown>;
  protected abstract applySnapshot(s: unknown): void;
  protected abstract draw(dt: number): void; // every client: render from the model
  protected abstract result(): MGResult;

  // ---------- life cycle ----------
  update(_t: number, delta: number) {
    if (this.finished || this.paused) return;
    const dt = Math.min(delta, 100) / 1000;
    if (!this.partnerHere) {
      this.waitText?.setText(`Waiting for your partner…\nThey get an invite on their phone.`);
      return;
    }
    this.waitText?.setText('');
    this.clock += dt;
    if (this.host) {
      this.hostTick(dt);
      this.sendAcc += dt;
      if (this.sendAcc >= SEND_EVERY && this.cfg.net) {
        this.sendAcc = 0;
        this.cfg.net.send('snap', this.snapshot());
      }
      if (this.duration > 0 && this.clock >= this.duration) this.end();
    }
    if (this.finished) return; // the scene may already be shutting down
    this.draw(dt);
  }

  /** Host ends the game and tells the guest. */
  protected end() {
    if (this.finished) return;
    const r = this.result();
    this.cfg.net?.send('end', r);
    this.finish(r);
  }

  private finish(r: MGResult) {
    if (this.finished) return;
    this.finished = true;
    this.cfg.onDone({ ...r, award: this.host });
  }

  protected quit() {
    if (this.finished) return;
    this.finished = true;
    this.cfg.net?.send('bye');
    this.cfg.onQuit();
  }

  // ---------- small drawing helpers ----------
  protected label(x: number, y: number, text: string, size = 20, color = '#6b4f4f', depth = 10): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5).setDepth(depth);
  }

  protected button(x: number, y: number, w: number, h: number, text: string, o: { fill?: number; onDown?: () => void; onUp?: () => void; size?: number } = {}) {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.graphics();
    const paint = (fill: number, down = false) => {
      bg.clear();
      bg.fillStyle(0x000000, 0.12);
      bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(-w / 2, -h / 2 + (down ? 3 : 0), w, h, 14);
    };
    let fill = o.fill ?? 0xffd9e2;
    paint(fill);
    const t = this.add.text(0, 0, text, { fontFamily: FONT, fontSize: `${o.size ?? 20}px`, color: '#6b4f4f', align: 'center', wordWrap: { width: w - 10 } }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      paint(fill, true);
      o.onDown?.();
    });
    const up = () => {
      paint(fill);
      o.onUp?.();
    };
    hit.on('pointerup', up);
    hit.on('pointerout', () => paint(fill));
    c.add([bg, t, hit]);
    return {
      c,
      setLabel: (s: string) => t.setText(s),
      setFill: (f: number) => {
        fill = f;
        paint(f);
      },
      setEnabled: (on: boolean) => {
        c.setAlpha(on ? 1 : 0.35);
        if (on) hit.setInteractive();
        else hit.disableInteractive();
      },
      setVisible: (v: boolean) => {
        c.setVisible(v);
        if (v) hit.setInteractive();
        else hit.disableInteractive();
      },
    };
  }

  protected panel(x: number, y: number, w: number, h: number, fill = 0xffffff, alpha = 0.9) {
    this.g.fillStyle(0x000000, 0.08);
    this.g.fillRoundedRect(x, y + 4, w, h, 18);
    this.g.fillStyle(fill, alpha);
    this.g.fillRoundedRect(x, y, w, h, 18);
  }

  protected exitButton() {
    return this.button(900, 24, 96, 36, 'Exit ✕', { fill: 0xe8e0f0, size: 16, onUp: () => this.quit() });
  }
}

/** Fits an image inside a box without changing its proportions ("contain"). */
export function fitBox<T extends Phaser.GameObjects.Image>(im: T, w: number, h: number): T {
  const f = im.frame;
  const k = Math.min(w / f.realWidth, h / f.realHeight);
  im.setScale(k);
  return im;
}

/** Fills a box without changing proportions, cropping nothing: the image may overhang the box ("cover"). */
export function coverBox<T extends Phaser.GameObjects.Image>(im: T, w: number, h: number): T {
  const f = im.frame;
  const k = Math.max(w / f.realWidth, h / f.realHeight);
  im.setScale(k);
  return im;
}
