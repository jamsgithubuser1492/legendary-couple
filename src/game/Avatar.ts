import Phaser from 'phaser';
import type { PlayerId } from '../types';
import { WALK_STRIPS } from './walkSheets';
import { tileCenter } from './iso';

export type Dir = 'front' | 'back' | 'left' | 'right';
const STEP_MS = 240;
const FEET = 6; // feet sit slightly below the tile center
const STRIP: Record<PlayerId, 'james_new' | 'rachel_new'> = { A: 'james_new', B: 'rachel_new' };
const PREFIX: Record<PlayerId, string> = { A: 'james', B: 'rachel' };
/** Frames in each strip: 0 to 2 walk west (mirrored for east), 3 to 5 walk toward the camera, 6 front, 7 back (James only). */
const SIDE = [0, 1, 2, 1];
const FRONT = [3, 4, 5, 4];
const STAND_SIDE = 2, STAND_FRONT = 6, STAND_BACK = 7;
const DISPLAY_H: Record<PlayerId, number> = { A: 52, B: 50 };

/** Registers every walking animation once. */
export function createWalkAnims(scene: Phaser.Scene) {
  const add = (key: string, tex: string, frames: number[], rate: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: frames.map((frame) => ({ key: tex, frame })), frameRate: rate, repeat: -1 });
  };
  for (const p of ['A', 'B'] as PlayerId[]) {
    add(`${PREFIX[p]}_side`, STRIP[p], SIDE, 8);
    add(`${PREFIX[p]}_front`, STRIP[p], FRONT, 8);
  }
  add('dog_walk', 'dog_walk_side', [0, 1, 2, 3, 4, 5], 10);
}

/** Preloads the walk strips as spritesheets. */
export function preloadWalkStrips(scene: Phaser.Scene) {
  for (const [name, m] of Object.entries(WALK_STRIPS)) scene.load.spritesheet(name, `${name}.png`, { frameWidth: m.fw, frameHeight: m.fh });
}

/**
 * One walking partner, drawn from a single consistent set of views.
 * East and west share one walk cycle (mirrored), and walking toward the camera has its own cycle.
 * The back view is a standing pose with a bounce for now, until a back walk cycle exists.
 * Diagonal screen directions use the nearest view.
 */
export class Avatar {
  readonly container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private token = 0;
  private idleTween?: Phaser.Tweens.Tween;
  dir: Dir = 'front';
  tile: { x: number; y: number };
  moving = false;

  constructor(private scene: Phaser.Scene, readonly player: PlayerId, tile: { x: number; y: number }, size = 1) {
    this.tile = { ...tile };
    const shadow = scene.add.ellipse(0, -1, 24, 10, 0x000000, 0.18);
    this.sprite = scene.add.sprite(0, 0, STRIP[player], STAND_FRONT).setOrigin(0.5, 1).setScale(0.5);
    this.container = scene.add.container(0, 0, [shadow, this.sprite]);
    this.container.setScale(size);
    this.snap(tile.x, tile.y);
    this.face('front', false);
  }

  private face(dir: Dir, walking: boolean, flipBack = false) {
    this.dir = dir;
    const s = this.sprite;
    const pre = PREFIX[this.player];
    s.setFlipX(false);
    if (dir === 'left' || dir === 'right') {
      s.setTexture(STRIP[this.player], STAND_SIDE).setScale(0.5).setFlipX(dir === 'left'); // the art faces east, so mirror it for west
      if (walking) s.play(`${pre}_side`, true);
      else s.stop();
    } else if (dir === 'front') {
      s.setTexture(STRIP[this.player], STAND_FRONT).setScale(0.5);
      if (walking) s.play(`${pre}_front`, true);
      else s.stop();
    } else {
      s.stop();
      if (this.player === 'A') s.setTexture('james_new', STAND_BACK).setScale(0.5);
      else s.setTexture('rachel_back').setScale(DISPLAY_H.B / s.height); // her back is a still sprite
      s.setFlipX(flipBack);
    }
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
          // placeholder bounce for the back view, which has no walk cycle yet
          if (this.dir === 'back') this.sprite.y = -Math.abs(Math.sin(t * Math.PI * 2)) * 3;
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
