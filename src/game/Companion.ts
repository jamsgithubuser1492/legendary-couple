import Phaser from 'phaser';
import { SPRITES } from './spriteList';
import { tileCenter } from './iso';

const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
const STEP_MS = 200;

/** A little friend (Hello Kitty, Miffy, Snoopy) who trots after you in their current outfit. */
export class Companion {
  readonly container: Phaser.GameObjects.Container;
  private img: Phaser.GameObjects.Image;
  private token = 0;
  tile: { x: number; y: number };
  moving = false;
  sprite: string;

  constructor(private scene: Phaser.Scene, sprite: string, tile: { x: number; y: number }) {
    this.sprite = sprite;
    this.tile = { ...tile };
    const shadow = scene.add.ellipse(0, -1, 22, 9, 0x000000, 0.16);
    this.img = scene.add.image(0, 0, sprite).setOrigin(0.5, 1);
    this.fit();
    this.container = scene.add.container(0, 0, [shadow, this.img]);
    this.snap(tile.x, tile.y);
  }

  private fit() {
    this.img.setScale((DW.get(this.sprite) ?? this.img.width) / this.img.width);
  }

  setOutfit(sprite: string) {
    if (sprite === this.sprite || !this.scene.textures.exists(sprite)) return;
    this.sprite = sprite;
    this.img.setTexture(sprite);
    this.fit();
  }

  snap(x: number, y: number) {
    this.tile = { x, y };
    const c = tileCenter(x, y);
    this.container.setPosition(c.x, c.y + 5);
    this.container.setDepth(x + y + 0.15);
  }

  walk(path: { x: number; y: number }[]) {
    const token = ++this.token;
    this.moving = true;
    let i = 0;
    const step = () => {
      if (token !== this.token) return;
      if (i >= path.length) {
        this.moving = false;
        this.img.y = 0;
        return;
      }
      const from = this.tile, next = path[i++];
      const a = tileCenter(from.x, from.y), b = tileCenter(next.x, next.y);
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: STEP_MS,
        onUpdate: (tw) => {
          if (token !== this.token) return;
          const t = tw.getValue() ?? 0;
          this.container.setPosition(a.x + (b.x - a.x) * t, a.y + 5 + (b.y - a.y) * t);
          this.container.setDepth(from.x + (next.x - from.x) * t + from.y + (next.y - from.y) * t + 0.15);
          this.img.y = -Math.abs(Math.sin(t * Math.PI)) * 4;
        },
        onComplete: () => {
          if (token !== this.token) return;
          this.tile = { ...next };
          step();
        },
      });
    };
    step();
  }

  destroy() {
    this.token++;
    this.container.destroy();
  }
}
