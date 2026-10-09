import Phaser from 'phaser';
import type { PlayerId } from '../types';
import { WALK_STRIPS } from './walkSheets';
import { tileCenter } from './iso';

export type Dir = 'front' | 'back' | 'left' | 'right';
const STEP_MS = 240;
const FEET = 6; // feet sit slightly below the tile center
type Look = 'cream' | 'dark';
const DISPLAY_H: Record<PlayerId, number> = { A: 52, B: 50 };

interface LookSpec {
  strip: (p: PlayerId) => string;
  right: number[]; // frames walking right on screen
  left: number[];
  flipLeft: boolean; // mirror the right-facing art for left
  standRight: number;
  standLeft: number;
  front: number[] | null; // walking toward the camera, or null to bounce the standing pose
  standFront: number;
  standBack: number;
}

const LOOKS: Record<Look, LookSpec> = {
  // cream cap set: one side cycle (mirrored) and a walk toward the camera
  cream: { strip: (p) => (p === 'A' ? 'james_new' : 'rachel_new'), right: [0, 1, 2, 1], left: [0, 1, 2, 1], flipLeft: true, standRight: 2, standLeft: 2, front: [3, 4, 5, 4], standFront: 6, standBack: 7 },
  // dark cap and beanie set: separate right and left cycles, standing front and back
  dark: { strip: (p) => (p === 'A' ? 'james_dark' : 'rachel_dark'), right: [0, 1, 2, 3], left: [4, 5, 6, 5], flipLeft: false, standRight: 1, standLeft: 5, front: null, standFront: 7, standBack: 8 },
};

/** Registers every walking animation once. */
export function createWalkAnims(scene: Phaser.Scene) {
  const add = (key: string, tex: string, frames: number[], rate: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: frames.map((frame) => ({ key: tex, frame })), frameRate: rate, repeat: -1 });
  };
  for (const look of Object.keys(LOOKS) as Look[])
    for (const p of ['A', 'B'] as PlayerId[]) {
      const spec = LOOKS[look], tex = spec.strip(p);
      add(`${tex}_right`, tex, spec.right, 8);
      add(`${tex}_left`, tex, spec.left, 8);
      if (spec.front) add(`${tex}_front`, tex, spec.front, 8);
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
  private look: Look = 'cream';
  dir: Dir = 'front';
  tile: { x: number; y: number };
  moving = false;

  constructor(private scene: Phaser.Scene, readonly player: PlayerId, tile: { x: number; y: number }, size = 1, look: Look = 'cream') {
    this.tile = { ...tile };
    this.look = look;
    const shadow = scene.add.ellipse(0, -1, 24, 10, 0x000000, 0.18);
    this.sprite = scene.add.sprite(0, 0, LOOKS[look].strip(player), LOOKS[look].standFront).setOrigin(0.5, 1).setScale(0.5);
    this.container = scene.add.container(0, 0, [shadow, this.sprite]);
    this.container.setScale(size);
    this.snap(tile.x, tile.y);
    this.face('front', false);
  }

  /** Switches between outfit sets (for example the cream cap or the dark cap and beanie). */
  setLook(look: Look) {
    if (look === this.look) return;
    this.look = look;
    this.face(this.dir, this.moving);
  }

  private face(dir: Dir, walking: boolean, flipBack = false) {
    this.dir = dir;
    const s = this.sprite, spec = LOOKS[this.look], tex = spec.strip(this.player);
    s.setFlipX(false);
    if (dir === 'left' || dir === 'right') {
      s.setTexture(tex, dir === 'right' ? spec.standRight : spec.standLeft).setScale(0.5).setFlipX(dir === 'left' && spec.flipLeft);
      if (walking) s.play(`${tex}_${dir}`, true);
      else s.stop();
    } else if (dir === 'front') {
      s.setTexture(tex, spec.standFront).setScale(0.5);
      if (walking && spec.front) s.play(`${tex}_front`, true);
      else s.stop();
    } else {
      s.stop();
      if (this.player === 'B' && this.look === 'cream') s.setTexture('rachel_back').setScale(DISPLAY_H.B / s.height); // her cream back is a still sprite
      else s.setTexture(tex, spec.standBack).setScale(0.5);
      s.setFlipX(flipBack && this.look === 'cream');
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
          if (this.dir === 'back' || (this.dir === 'front' && !LOOKS[this.look].front)) this.sprite.y = -Math.abs(Math.sin(t * Math.PI * 2)) * 3;
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
