import Phaser from 'phaser';
import type { PlayerId } from '../../types';
import type { MGResult } from '../../state/minigames';
import type { MinigameNet } from './net';

export const W = 960;
export const H = 540;
export const FONT = '"Baloo 2", system-ui, sans-serif';
export const BOT_NAME = 'Mochi';

export interface MGInit {
  role: PlayerId; // which partner this device plays
  solo: boolean; // practice against the Mochi bot
  net: MinigameNet | null;
  names: Record<PlayerId, string>;
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.fit, this);
      this.offNet?.();
      clearInterval(this.helloTimer);
    });
  }

  private fit() {
    const cam = this.cameras.main;
    cam.setZoom(Math.min(cam.width / W, cam.height / H));
    cam.centerOn(W / 2, H / 2);
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
    if (this.finished) return;
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
