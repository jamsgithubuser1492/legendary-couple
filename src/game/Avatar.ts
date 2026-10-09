import Phaser from 'phaser';
import type { PlayerId } from '../types';
import { SPRITES, WALK_SHEET } from './spriteList';
import { tileCenter } from './iso';

type Dir = 'front' | 'back' | 'left' | 'right';
const STEP_MS = 240;
const FEET = 6; // feet sit slightly below the tile center
const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
const RACHEL_DIR: Record<Dir, { key: string; flip: boolean }> = {
  front: { key: 'rachel_front', flip: false },
  back: { key: 'rachel_back', flip: false },
  left: { key: 'rachel_side', flip: false }, // the side sprite faces left
  right: { key: 'rachel_side', flip: true },
};

export function createWalkAnims(scene: Phaser.Scene) {
  WALK_SHEET.rows.forEach((dir, row) => {
    const key = `james_${dir}`;
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(WALK_SHEET.key, { start: row * 4, end: row * 4 + 3 }),
      frameRate: 8,
      repeat: -1,
    });
  });
}

/** One walking partner. James uses the 4 direction walk cycle, Rachel swaps between her view sprites. */
export class Avatar {
  readonly container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  private token = 0;
  tile: { x: number; y: number };
  moving = false;

  constructor(private scene: Phaser.Scene, readonly player: PlayerId, tile: { x: number; y: number }) {
    this.tile = { ...tile };
    const shadow = scene.add.ellipse(0, -1, 24, 10, 0x000000, 0.18);
    if (player === 'A') {
      this.sprite = scene.add.sprite(0, 0, WALK_SHEET.key, 0).setOrigin(0.5, 1).setScale(0.5);
    } else {
      this.sprite = scene.add.image(0, 0, 'rachel_front').setOrigin(0.5, 1);
    }
    this.container = scene.add.container(0, 0, [shadow, this.sprite]);
    this.snap(tile.x, tile.y);
    this.face('front', false);
  }

  private face(dir: Dir, walking: boolean, flipBack = false) {
    if (this.player === 'A') {
      const s = this.sprite as Phaser.GameObjects.Sprite;
      s.setFlipX(dir === 'back' && flipBack);
      if (walking) s.play(`james_${dir}`, true);
      else {
        s.stop();
        s.setFrame(WALK_SHEET.rows.indexOf(dir) * 4);
      }
    } else {
      const { key, flip } = RACHEL_DIR[dir];
      const s = this.sprite as Phaser.GameObjects.Image;
      s.setTexture(key);
      s.setScale((DW.get(key) ?? s.width) / s.width);
      s.setFlipX(flip || (dir === 'back' && flipBack));
    }
  }

  snap(x: number, y: number) {
    this.tile = { x, y };
    const c = tileCenter(x, y);
    this.container.setPosition(c.x, c.y + FEET);
    this.container.setDepth(x + y + 0.2);
  }

  stop() {
    this.token++;
    this.moving = false;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.y = 0;
  }

  /** Walks the avatar tile by tile. onStep fires after each tile, onDone at the end. */
  walk(path: { x: number; y: number }[], onDone?: () => void) {
    this.stop();
    if (!path.length) return;
    const token = ++this.token;
    this.moving = true;
    let i = 0;
    const step = () => {
      if (token !== this.token) return;
      if (i >= path.length) {
        this.moving = false;
        this.face('front', false);
        this.sprite.y = 0;
        onDone?.();
        return;
      }
      const from = this.tile;
      const next = path[i++];
      const dx = next.x - from.x, dy = next.y - from.y;
      if (dx > 0) this.face('right', true);
      else if (dy > 0) this.face('left', true);
      else if (dx < 0) this.face('back', true, false);
      else this.face('back', true, true);
      const a = tileCenter(from.x, from.y), b = tileCenter(next.x, next.y);
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: STEP_MS,
        onUpdate: (tw) => {
          if (token !== this.token) return;
          const t = tw.getValue() ?? 0;
          this.container.setPosition(a.x + (b.x - a.x) * t, a.y + FEET + (b.y - a.y) * t);
          this.container.setDepth(from.x + (next.x - from.x) * t + from.y + (next.y - from.y) * t + 0.2);
          if (this.player === 'B') this.sprite.y = -Math.abs(Math.sin(t * Math.PI * 2)) * 3; // little hop, she has one pose per view
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
    this.stop();
    this.container.destroy();
  }
}
