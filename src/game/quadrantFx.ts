import Phaser from 'phaser';
import type { PlayerId } from '../types';
import { getMe, getState, onStateChange, sendTea } from '../state/store';
import { quadrantInfo } from '../state/quadrants';
import type { Avatar } from './Avatar';

/**
 * Visual feedback for the quadrant mechanics, shared by the island and the town:
 * Vitality Glow and Synergy Aura under the avatars, the Focus Beacon lantern, and the aura burst when a goal is approved.
 */
export class QuadrantFx {
  private glows = new Map<PlayerId, Phaser.GameObjects.Ellipse>();
  private halos = new Map<PlayerId, Phaser.GameObjects.Ellipse>();
  private lanterns = new Map<PlayerId, Phaser.GameObjects.Container>();
  private seen: string | null;
  private tapAt = 0;
  private off: () => void;
  private timer: Phaser.Time.TimerEvent;

  constructor(private scene: Phaser.Scene, private avatars: () => Record<PlayerId, Avatar>) {
    this.seen = getState().celebration?.id ?? null; // do not replay an old celebration when the scene opens
    this.off = onStateChange(() => this.sync());
    this.timer = scene.time.addEvent({ delay: 1000, loop: true, callback: () => this.sync(false) });
    scene.input.on('gameobjectdown', this.onObj, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.sync();
  }

  /** True just after a lantern tap, so the scene does not also treat it as a click to walk. */
  tappedRecently() {
    return this.scene.time.now - this.tapAt < 400;
  }

  private onObj(_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) {
    const owner = obj.getData('lanternOf') as PlayerId | undefined;
    if (!owner) return;
    this.tapAt = this.scene.time.now;
    const me = getMe();
    if (owner !== me && sendTea(me)) this.popText(owner, '🍵 Tea sent');
  }

  private popText(p: PlayerId, text: string) {
    const c = this.avatars()[p]?.container;
    if (!c) return;
    const t = this.scene.add.text(c.x, c.y - 90, text, { fontFamily: '"Baloo 2", system-ui', fontSize: '16px', color: '#ffffff', stroke: '#8a5a44', strokeThickness: 4 }).setOrigin(0.5).setDepth(5000);
    this.scene.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
  }

  private sync(allowBurst = true) {
    if (!this.scene.scene.isActive()) return;
    const s = getState(), now = Date.now(), av = this.avatars();
    if (!av) return;
    for (const p of ['A', 'B'] as PlayerId[]) {
      const a = av[p];
      if (!a) continue;
      // Vitality Glow
      const vit = s.vitalityUntil[p] > now;
      let g = this.glows.get(p);
      if (vit && !g) {
        g = this.scene.add.ellipse(0, -1, 54, 22, 0x9ff0a8, 0.55);
        a.container.addAt(g, 0);
        this.scene.tweens.add({ targets: g, scaleX: 1.25, scaleY: 1.25, alpha: 0.25, duration: 1100, yoyo: true, repeat: -1 });
        this.glows.set(p, g);
      } else if (!vit && g) {
        g.destroy();
        this.glows.delete(p);
      }
      // Synergy Aura
      const syn = s.synergyUntil > now;
      let h = this.halos.get(p);
      if (syn && !h) {
        h = this.scene.add.ellipse(0, -1, 78, 32, 0xffe27a, 0.3).setStrokeStyle(2, 0xffd23f, 0.8);
        a.container.addAt(h, 0);
        this.scene.tweens.add({ targets: h, scaleX: 1.2, scaleY: 1.2, alpha: 0.12, duration: 1600, yoyo: true, repeat: -1 });
        this.halos.set(p, h);
      } else if (!syn && h) {
        h.destroy();
        this.halos.delete(p);
      }
      // Focus Beacon lantern
      const f = s.focus[p];
      const focusing = !!f && !f.paid && f.until > now;
      let l = this.lanterns.get(p);
      if (focusing && !l) {
        const glow = this.scene.add.circle(0, -84, 26, 0xffd27a, 0.35);
        const art = this.scene.textures.exists('fx_lantern_2');
        const txt = (art ? this.scene.add.image(0, -84, 'fx_lantern_2').setScale(0.5) : this.scene.add.text(0, -84, '🏮', { fontSize: '30px' }).setOrigin(0.5)).setData('lanternOf', p).setInteractive({ useHandCursor: true });
        if (art) this.scene.tweens.add({ targets: txt, scale: 0.56, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        l = this.scene.add.container(0, 0, [glow, txt]);
        a.container.add(l);
        this.scene.tweens.add({ targets: l, y: -5, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.scene.tweens.add({ targets: glow, alpha: 0.12, scale: 1.4, duration: 1000, yoyo: true, repeat: -1 });
        this.lanterns.set(p, l);
      } else if (!focusing && l) {
        l.destroy();
        this.lanterns.delete(p);
      }
    }
    const c = s.celebration;
    if (allowBurst && c && c.id !== this.seen) {
      this.seen = c.id;
      this.burst(c.by, c.quadrant);
    }
  }

  /** Pastel aura burst over the avatar: leaves for health, coins for finance, hearts for romance, and so on. */
  burst(p: PlayerId, quadrant: Parameters<typeof quadrantInfo>[0]) {
    const a = this.avatars()[p];
    if (!a) return;
    const q = quadrantInfo(quadrant);
    const { x, y } = a.container;
    const ring = this.scene.add.circle(x, y - 24, 12, q.tint, 0.5).setStrokeStyle(4, q.tint, 0.9).setDepth(4999);
    this.scene.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 1100, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
    const icons = Array.from(q.aura.match(/\p{Extended_Pictographic}/gu) ?? ['✨']);
    for (let i = 0; i < 12; i++) {
      const t = this.scene.add.text(x + (Math.random() - 0.5) * 30, y - 20, icons[i % icons.length], { fontSize: `${18 + Math.random() * 10}px` }).setOrigin(0.5).setDepth(5000);
      this.scene.tweens.add({
        targets: t, x: t.x + (Math.random() - 0.5) * 110, y: t.y - 60 - Math.random() * 70, alpha: 0, angle: (Math.random() - 0.5) * 60,
        duration: 1400 + Math.random() * 700, delay: i * 70, ease: 'Sine.easeOut', onComplete: () => t.destroy(),
      });
    }
  }

  destroy() {
    this.off();
    this.timer.remove();
    this.scene.input.off('gameobjectdown', this.onObj, this);
  }
}
