import Phaser from 'phaser';
import { cartesianToIso } from '../iso';
import { SPRITES } from '../spriteList';

const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
type Pt = { x: number; y: number };

interface Boat {
  img: Phaser.GameObjects.Image;
  wake: Phaser.GameObjects.Graphics;
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
  private moored: { img: Phaser.GameObjects.Image; ph: number; base: Pt }[] = [];

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
    const wake = this.scene.add.graphics().setDepth(-46);
    const pos = { ...route[0] };
    this.boats.push({ img: this.image(`${kind}_fr`), wake, kind, route, speed, seg: 0, t: 0, dir: 1, ph, pos });
  }

  addMoored(key: string, at: Pt, ph: number) {
    if (!this.scene.textures.exists(key)) return;
    this.moored.push({ img: this.image(key), ph, base: cartesianToIso(at.x, at.y) });
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
      // a soft wake: two fading ovals behind the boat
      b.wake.clear();
      const bx = (from.x - to.x) / len, by = (from.y - to.y) / len;
      for (let i = 1; i <= 4; i++) {
        const w = cartesianToIso(x + bx * i * 0.45, y + by * i * 0.45);
        b.wake.fillStyle(0xffffff, 0.34 - i * 0.07);
        b.wake.fillEllipse(w.x, w.y + 6, 22 + i * 7, 6 + i * 1.6);
      }
    }
    for (const m of this.moored) {
      m.img.setPosition(m.base.x, m.base.y + Math.sin(time / 800 + m.ph) * 1.6);
      m.img.setAngle(Math.sin(time / 1100 + m.ph) * 2.5);
    }
  }

  destroy() {
    this.boats.forEach((b) => {
      b.img.destroy();
      b.wake.destroy();
    });
    this.moored.forEach((m) => m.img.destroy());
    this.boats = [];
    this.moored = [];
  }
}
