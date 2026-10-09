import Phaser from 'phaser';
import { cartesianToIso } from '../iso';
import { SPRITES } from '../spriteList';

const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
type Pt = { x: number; y: number };

interface Boat {
  img: Phaser.GameObjects.Image;
  wake: Phaser.GameObjects.Image | null;
  ripple: Phaser.GameObjects.Image | null;
  kind: 'sail' | 'fish';
  route: Pt[];
  speed: number; // tiles per second
  seg: number;
  t: number;
  dir: 1 | -1;
  ph: number;
  pos: Pt;
}

const frameFor = (kind: 'sail' | 'fish', dx: number, dy: number) => {
  const right = dx - dy > 0; // screen x direction
  const front = dx + dy > 0; // moving down the screen, toward the viewer
  return `${kind}_${front ? 'f' : 'b'}${right ? 'r' : 'l'}`;
};

/** Sailboats and fishing boats that drift slowly along the sea, bobbing on the swell and leaving a soft wake. */
export class Boats {
  private boats: Boat[] = [];
  private moored: { img: Phaser.GameObjects.Image; ripple: Phaser.GameObjects.Image | null; ph: number; base: Pt }[] = [];

  constructor(private scene: Phaser.Scene) {
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private image(key: string): Phaser.GameObjects.Image {
    const im = this.scene.add.image(0, 0, key).setOrigin(0.5, 0.82).setDepth(-45);
    im.setScale((DW.get(key) ?? im.width) / im.width);
    return im;
  }

  addBoat(kind: 'sail' | 'fish', route: Pt[], speed: number, ph: number) {
    if (!this.scene.textures.exists(`${kind}_fr`)) return;
    const has = (k: string) => this.scene.textures.exists(k);
    const wakeKey = kind === 'fish' ? 'wake_prop' : 'wake_dinghy';
    const wake = has(wakeKey) ? this.scene.add.image(0, 0, wakeKey).setOrigin(1, 0.5).setDepth(-46).setScale(0.55) : null;
    const ripple = has('ripple_ring') ? this.scene.add.image(0, 0, 'ripple_ring').setDepth(-47).setScale(0.5).setAlpha(0.5) : null;
    const pos = { ...route[0] };
    this.boats.push({ img: this.image(`${kind}_fr`), wake, kind, route, speed, seg: 0, t: 0, dir: 1, ph, pos, ripple });
  }

  addMoored(key: string, at: Pt, ph: number) {
    if (!this.scene.textures.exists(key)) return;
    const ripple = this.scene.textures.exists('ripple_ring') ? this.scene.add.image(0, 0, 'ripple_ring').setDepth(-47).setScale(0.4) : null;
    this.moored.push({ img: this.image(key), ripple, ph, base: cartesianToIso(at.x, at.y) });
  }

  private update(time: number, delta: number) {
    const dt = delta / 1000;
    for (const b of this.boats) {
      const a = b.route[b.seg], c = b.route[b.seg + b.dir];
      const len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
      b.t += (b.speed * dt) / len;
      if (b.t >= 1) {
        b.seg += b.dir;
        b.t = 0;
        if (b.seg + b.dir < 0 || b.seg + b.dir >= b.route.length) b.dir = b.dir === 1 ? -1 : 1; // turn around at the ends
      }
      const from = b.route[b.seg], to = b.route[b.seg + b.dir];
      const x = from.x + (to.x - from.x) * b.t, y = from.y + (to.y - from.y) * b.t;
      b.pos = { x, y };
      const key = frameFor(b.kind, to.x - from.x, to.y - from.y);
      if (this.scene.textures.exists(key) && b.img.texture.key !== key) {
        b.img.setTexture(key);
        b.img.setScale((DW.get(key) ?? b.img.width) / b.img.width);
      }
      const s = cartesianToIso(x, y);
      const bob = Math.sin(time / 700 + b.ph) * 1.8;
      b.img.setPosition(s.x, s.y + bob);
      b.img.setAngle(Math.sin(time / 900 + b.ph * 1.7) * 2.2);
      // the wake trails behind, turned to follow the boat's heading on screen
      const heading = Math.atan2((to.x + to.y - from.x - from.y) * 16, (to.x - to.y - from.x + from.y) * 32);
      if (b.wake) {
        b.wake.setPosition(s.x, s.y + 8).setRotation(heading).setAlpha(0.55 + Math.sin(time / 400 + b.ph) * 0.15);
        b.wake.setFlipY(false);
      }
      if (b.ripple) {
        const pulse = (time / 2200 + b.ph) % 1;
        b.ripple.setPosition(s.x, s.y + 8).setScale(0.35 + pulse * 0.4).setAlpha((1 - pulse) * 0.5);
      }
    }
    for (const m of this.moored) {
      m.img.setPosition(m.base.x, m.base.y + Math.sin(time / 800 + m.ph) * 1.6);
      m.img.setAngle(Math.sin(time / 1100 + m.ph) * 2.5);
      if (m.ripple) {
        const pulse = (time / 2600 + m.ph) % 1; // rings spread out from each moored boat and fade
        m.ripple.setPosition(m.base.x, m.base.y + 8).setScale(0.3 + pulse * 0.4).setAlpha((1 - pulse) * 0.55);
      }
    }
  }

  destroy() {
    this.boats.forEach((b) => {
      b.img.destroy();
      b.wake?.destroy();
      b.ripple?.destroy();
    });
    this.moored.forEach((m) => {
      m.img.destroy();
      m.ripple?.destroy();
    });
    this.boats = [];
    this.moored = [];
  }
}
