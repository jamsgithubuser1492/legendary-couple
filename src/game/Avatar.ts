import Phaser from 'phaser';
import type { PlayerId } from '../types';
import { SPRITES, WALK_SHEET } from './spriteList';
import { WALK_STRIPS } from './walkSheets';
import { tileCenter } from './iso';

export type Dir = 'front' | 'back' | 'left' | 'right';
const STEP_MS = 240;
const FEET = 6; // feet sit slightly below the tile center
const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
const STILL: Record<Dir, string> = { front: 'rachel_front', back: 'rachel_back', left: 'rachel_side', right: 'rachel_side' };

/** Registers every walking animation once. */
export function createWalkAnims(scene: Phaser.Scene) {
  const add = (key: string, tex: string, start: number, end: number, rate: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(tex, { start, end }), frameRate: rate, repeat: -1 });
  };
  WALK_SHEET.rows.forEach((dir, row) => add(`james_${dir}`, WALK_SHEET.key, row * 4, row * 4 + 3, 8));
  add('james_side', 'james_walk_side', 0, WALK_STRIPS.james_walk_side.frames - 1, 10);
  add('rachel_side', 'rachel_walk_side', 0, 4, 9); // the first five frames are the side walk, the last two are a turn
  add('dog_walk', 'dog_walk_side', 0, 5, 10);
}

/** Preloads the walk strips as spritesheets. */
export function preloadWalkStrips(scene: Phaser.Scene) {
  for (const [name, m] of Object.entries(WALK_STRIPS)) scene.load.spritesheet(name, `${name}.png`, { frameWidth: m.fw, frameHeight: m.fh });
}

/**
 * One walking partner.
 * James: real 4 direction cycle, plus a 7 frame side cycle for east and west.
 * Rachel: real 5 frame side cycle; her front and back views use her stills with a bounce as a placeholder walk.
 * Diagonal screen directions use the nearest view, mirrored where needed.
 */
export class Avatar {
  readonly container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private token = 0;
  private idleTween?: Phaser.Tweens.Tween;
  dir: Dir = 'front';
  tile: { x: number; y: number };
  moving = false;

  constructor(private scene: Phaser.Scene, readonly player: PlayerId, tile: { x: number; y: number }) {
    this.tile = { ...tile };
    const shadow = scene.add.ellipse(0, -1, 24, 10, 0x000000, 0.18);
    this.sprite = player === 'A' ? scene.add.sprite(0, 0, WALK_SHEET.key, 0) : scene.add.sprite(0, 0, 'rachel_front');
    this.sprite.setOrigin(0.5, 1);
    this.container = scene.add.container(0, 0, [shadow, this.sprite]);
    this.snap(tile.x, tile.y);
    this.face('front', false);
  }

  private setStill(key: string) {
    this.sprite.stop();
    this.sprite.setTexture(key);
    this.sprite.setScale((DW.get(key) ?? this.sprite.width) / this.sprite.width);
  }

  private face(dir: Dir, walking: boolean, flipBack = false) {
    this.dir = dir;
    const s = this.sprite;
    const side = dir === 'left' || dir === 'right';
    s.setFlipX(false);
    if (this.player === 'A') {
      if (side) {
        s.setTexture('james_walk_side', 0).setScale(0.5).setFlipX(dir === 'left');
        if (walking) s.play('james_side', true);
        else s.stop();
        return;
      }
      s.setTexture(WALK_SHEET.key).setScale(0.5).setFlipX(dir === 'back' && flipBack);
      if (walking) s.play(`james_${dir}`, true);
      else {
        s.stop();
        s.setFrame(WALK_SHEET.rows.indexOf(dir) * 4);
      }
      return;
    }
    if (side) {
      s.setTexture('rachel_walk_side', 0).setScale(0.5).setFlipX(dir === 'left');
      if (walking) s.play('rachel_side', true);
      else s.stop();
      return;
    }
    this.setStill(STILL[dir]);
    s.setFlipX(dir === 'back' && flipBack);
  }

  /** A gentle breathing bob while standing still. */
  private startIdle() {
    this.idleTween?.stop();
    this.idleTween = this.scene.tweens.add({ targets: this.sprite, y: -1.4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
    this.idleTween?.stop();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.y = 0;
  }

  /** Picks the view for a tile step: both axes means a straight north, south, east or west on screen. */
  private faceStep(dx: number, dy: number) {
    if (dx > 0 && dy > 0) this.face('front', true);
    else if (dx < 0 && dy < 0) this.face('back', true, false);
    else if (dx > 0 && dy < 0) this.face('right', true);
    else if (dx < 0 && dy > 0) this.face('left', true);
    else if (dx > 0) this.face('right', true);
    else if (dy > 0) this.face('left', true);
    else if (dx < 0) this.face('back', true, false);
    else this.face('back', true, true);
  }

  /** Walks the avatar tile by tile. onDone fires at the end. */
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
        this.face(this.dir, false); // stand in the view we ended in
        this.sprite.y = 0;
        this.startIdle();
        onDone?.();
        return;
      }
      const from = this.tile;
      const next = path[i++];
      const dx = next.x - from.x, dy = next.y - from.y;
      this.faceStep(dx, dy);
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
          // placeholder bounce for views without a real walk cycle (Rachel front and back)
          if (this.player === 'B' && (this.dir === 'front' || this.dir === 'back')) this.sprite.y = -Math.abs(Math.sin(t * Math.PI * 2)) * 3;
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
