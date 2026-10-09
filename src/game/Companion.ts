import Phaser from 'phaser';
import { SPRITES } from './spriteList';
import { tileCenter } from './iso';

const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
const STEP_MS = 200;

/**
 * A little friend who trots after you.
 * The dog has a real walking cycle. Hello Kitty, Miffy and Snoopy only have a standing pose per outfit,
 * so they get a placeholder walk: a bounce, a little sway and mirroring toward the way they move.
 */
export class Companion {
  readonly container: Phaser.GameObjects.Container;
  private img: Phaser.GameObjects.Sprite;
  private token = 0;
  private faceLeft = false;
  tile: { x: number; y: number };
  moving = false;
  sprite: string;
  private walkSheet?: string;

  constructor(private scene: Phaser.Scene, sprite: string, tile: { x: number; y: number }, walkSheet?: string) {
    this.sprite = sprite;
    this.walkSheet = walkSheet;
    this.tile = { ...tile };
    const shadow = scene.add.ellipse(0, -1, walkSheet ? 22 : 18, walkSheet ? 8 : 7, 0x000000, 0.16);
    this.img = scene.add.sprite(0, 0, walkSheet ?? sprite, walkSheet ? 6 : undefined).setOrigin(0.5, 1);
    this.fit();
    this.container = scene.add.container(0, 0, [shadow, this.img]);
    this.snap(tile.x, tile.y);
  }

  private fit() {
    this.img.setScale(this.walkSheet ? 0.5 : (DW.get(this.sprite) ?? this.img.width) / this.img.width);
  }

  setOutfit(sprite: string) {
    if (this.walkSheet || sprite === this.sprite || !this.scene.textures.exists(sprite)) return;
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
        this.img.setAngle(0);
        if (this.walkSheet) {
          this.img.stop();
          this.img.setFrame(6); // sits down when you stop
        }
        return;
      }
      const from = this.tile, next = path[i++];
      const dx = next.x - from.x, dy = next.y - from.y;
      if (!(dx > 0 && dy > 0) && !(dx < 0 && dy < 0)) this.faceLeft = dx < 0 || dy > 0; // straight up or down keeps the last side
      this.img.setFlipX(this.faceLeft);
      if (this.walkSheet) this.img.play('dog_walk', true);
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
          if (!this.walkSheet) {
            this.img.y = -Math.abs(Math.sin(t * Math.PI)) * 4;
            this.img.setAngle(Math.sin(t * Math.PI * 2) * 4); // sway, a placeholder for a real walk cycle
          }
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
