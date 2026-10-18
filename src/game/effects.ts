import Phaser from 'phaser';
import type { PlayerId } from '../types';
import type { Avatar } from './Avatar';
import { GRID_SIZE, tileCenter } from './iso';
import { getMe, getState } from '../state/store';
import { LANTERN, POST, TREE } from '../state/placement';
import { lanternTier, streakNow } from '../state/weekly';
import { BIDS } from '../state/together';

const hash = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

/** Living touches on the home island: fireside starlight, the Connected aura, bid emotes and the Gratitude Tree. */
export class IslandEffects {
  private glow: Phaser.GameObjects.Graphics;
  private aura: Phaser.GameObjects.Graphics;
  private treeImg?: Phaser.GameObjects.Image;
  private treeDots: Phaser.GameObjects.Graphics;
  private treeCount = -1;
  private lanternGlow: Phaser.GameObjects.Graphics;
  private lanternImg?: Phaser.GameObjects.Image;
  private lanternTier = -1;
  private envelope?: Phaser.GameObjects.Text;
  private lastBid = 0;
  private last = 0;

  constructor(private scene: Phaser.Scene, private avatars: () => Record<PlayerId, Avatar>) {
    this.glow = scene.add.graphics().setDepth(9100);
    this.aura = scene.add.graphics().setDepth(0);
    this.treeDots = scene.add.graphics();
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
    this.lanternGlow = scene.add.graphics();
    this.drawTree(getState().gratitude.length);
    this.drawPorch();
  }

  /** The Synergy Lantern on its post, and the striped postbox: tap either to open it. */
  private drawPorch() {
    const sc = this.scene;
    const lc = tileCenter(LANTERN.x, LANTERN.y);
    const depth = LANTERN.x + LANTERN.y + 0.5;
    const post = sc.add.graphics().setDepth(depth - 0.05);
    post.fillStyle(0x8a5a44, 1);
    post.fillRect(lc.x - 2, lc.y - 50, 4, 62);
    post.fillRect(lc.x - 2, lc.y - 52, 14, 4);
    this.lanternGlow.setDepth(depth - 0.1);
    if (sc.textures.exists('fx_lantern_4')) this.lanternImg = sc.add.image(lc.x + 10, lc.y - 44, 'fx_lantern_4').setOrigin(0.5, 0).setScale(0.5).setDepth(depth);
    const pc = tileCenter(POST.x, POST.y);
    if (sc.textures.exists('mailbox_red')) sc.add.image(pc.x, pc.y + 12, 'mailbox_red').setOrigin(0.5, 1).setScale(0.85).setDepth(POST.x + POST.y + 0.5);
    this.envelope = sc.add.text(pc.x, pc.y - 56, '✉️', { fontSize: '20px' }).setOrigin(0.5).setDepth(POST.x + POST.y + 0.6).setVisible(false);
    sc.tweens.add({ targets: this.envelope, y: pc.y - 62, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Warmer as the streak grows: unlit, pastel blue, soft pink, golden sparkle, then a rainbow aura. */
  private updatePorch(time: number) {
    const s = getState();
    const tier = lanternTier(streakNow(s));
    const lc = tileCenter(LANTERN.x, LANTERN.y);
    if (this.lanternImg && tier !== this.lanternTier) {
      this.lanternTier = tier;
      this.lanternImg.setTexture(['fx_lantern_4', 'fx_lantern_2', 'fx_lantern_1', 'fx_lantern_3', 'fx_lantern_3'][tier]);
    }
    const g = this.lanternGlow;
    g.clear();
    if (tier > 0) {
      const col = [0, 0x9fd0ff, 0xffb0cf, 0xffd966, Phaser.Display.Color.HSLToColor((time / 4000) % 1, 0.8, 0.75).color][tier];
      const pulse = 0.5 + 0.5 * Math.sin(time / 600);
      g.fillStyle(col, 0.16 + pulse * 0.1);
      g.fillCircle(lc.x + 10, lc.y - 24, 30 + tier * 8);
      g.fillStyle(col, 0.22);
      g.fillCircle(lc.x + 10, lc.y - 24, 18 + tier * 3);
      if (tier >= 3) {
        g.fillStyle(0xffffff, 0.9);
        for (let i = 0; i < 5; i++) {
          const a = time / 900 + i * 1.26;
          g.fillCircle(lc.x + 10 + Math.cos(a) * 34, lc.y - 24 + Math.sin(a * 1.3) * 26, 1.8);
        }
      }
    }
    const me = getMe();
    this.envelope?.setVisible(s.surprises.some((x) => x.to === me && !x.doneAt));
  }

  /** How big the tree looks for a number of notes. */
  private drawTree(n: number) {
    this.treeCount = n;
    const c = tileCenter(TREE.x, TREE.y);
    const key = n >= 20 ? 'tree_blossom' : 'tree_round';
    if (!this.scene.textures.exists(key)) return;
    const width = 26 + Math.min(n, 30) * 1.7;
    if (!this.treeImg) this.treeImg = this.scene.add.image(c.x, c.y + 14, key).setOrigin(0.5, 1);
    this.treeImg.setTexture(key);
    this.treeImg.setScale(width / this.treeImg.width).setDepth(TREE.x + TREE.y + 0.4);
    // each note is a leaf, and every fifth a little blossom
    const g = this.treeDots;
    g.clear().setDepth(TREE.x + TREE.y + 0.5);
    const h = this.treeImg.displayHeight;
    for (let i = 0; i < Math.min(n, 60); i++) {
      const a = hash(i, 3) * Math.PI * 2, r = (0.12 + hash(i, 5) * 0.38) * width;
      const x = c.x + Math.cos(a) * r, y = c.y + 14 - h * 0.62 + Math.sin(a) * r * 0.7;
      g.fillStyle(i % 5 === 4 ? 0xff9fbd : 0xcfe8a0, 0.95);
      g.fillCircle(x, y, i % 5 === 4 ? 3.2 : 2.4);
    }
  }

  private emote(from: PlayerId, kind: string) {
    const av = this.avatars()[from];
    const icon = BIDS.find((b) => b.id === kind)?.icon ?? '💞';
    const t = this.scene.add.text(av.container.x, av.container.y - 70, icon, { fontSize: '28px' }).setOrigin(0.5).setDepth(9500);
    this.scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 2600, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }

  private update(time: number) {
    if (time - this.last < 80) return;
    this.last = time;
    const s = getState();
    const now = Date.now();
    if (s.gratitude.length !== this.treeCount) this.drawTree(s.gratitude.length);
    this.updatePorch(time);

    // starry sky and warm firelight while the glow lasts
    this.glow.clear();
    if (s.glowUntil > now) {
      const c = tileCenter(GRID_SIZE / 2, GRID_SIZE / 2);
      const R = GRID_SIZE * 40;
      this.glow.fillStyle(0xffb066, 0.07);
      this.glow.fillEllipse(c.x, c.y, R * 2.4, R * 1.2);
      for (let i = 0; i < 46; i++) {
        const a = Math.max(0, Math.sin(time / 700 + i * 1.9));
        if (a < 0.2) continue;
        const x = c.x + (hash(i, 1) - 0.5) * R * 2.6, y = c.y + (hash(2, i) - 0.7) * R * 1.3;
        this.glow.fillStyle(0xfff6c8, a * 0.9);
        this.glow.fillCircle(x, y, 1.6 + a * 1.6);
      }
    }

    // Connected aura under both avatars
    this.aura.clear();
    if (s.auraUntil > now) {
      const pulse = 0.5 + 0.5 * Math.sin(time / 500);
      for (const p of ['A', 'B'] as PlayerId[]) {
        const c = this.avatars()[p].container;
        this.aura.fillStyle(0xff9fbd, 0.18 + pulse * 0.12);
        this.aura.fillEllipse(c.x, c.y + 2, 54 + pulse * 10, 24 + pulse * 4);
        this.aura.setDepth(c.depth - 0.05);
      }
    }

    // a floating emote above whoever sent a new bid
    if (s.bid && s.bid.ts !== this.lastBid && now - s.bid.ts < 6000) {
      this.lastBid = s.bid.ts;
      this.emote(s.bid.from, s.bid.kind);
    }
  }
}
