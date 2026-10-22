import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { TownScene } from './scenes/TownScene';
import { gameBus } from './events';
import { createManager } from './minigames/MinigameManager';
import { OrchardScene } from './minigames/OrchardScene';
import { PlatformerScene } from './minigames/PlatformerScene';
import { CafeScene } from './scenes/CafeScene';
import { MatchaMastersScene } from './minigames/MatchaMastersScene';
import { StellarFishingScene } from './minigames/StellarFishingScene';
import { CraneCrazeScene } from './minigames/CraneCrazeScene';
import { TEXT_RES } from './render';

/**
 * The canvas parent is drawn smaller than it measures (CSS scale of 1 over DPR) so the canvas can have one pixel per
 * device pixel. Phaser reads the parent with getBoundingClientRect, which includes that scale, so read the layout size.
 */
const scaleProto = Phaser.Scale.ScaleManager.prototype as unknown as { getParentBounds: (this: Phaser.Scale.ScaleManager) => boolean };
scaleProto.getParentBounds = function () {
  const parent = this.parent as HTMLElement | null;
  if (!parent) return false;
  const w = parent.offsetWidth, h = parent.offsetHeight;
  const ps = this.parentSize;
  if (ps.width !== w || ps.height !== h) {
    ps.setSize(w, h);
    return true;
  }
  if (this.canvas) {
    const b = this.canvasBounds, r = this.canvas.getBoundingClientRect();
    if (r.x !== b.x || r.y !== b.y) return true;
  }
  return false;
};

/** Every Text gets enough resolution for a zoomed or retina canvas. */
const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as { text: (...a: unknown[]) => Phaser.GameObjects.Text };
const makeText = factory.text;
factory.text = function (this: unknown, ...a: unknown[]) {
  const t = makeText.apply(this, a);
  t.setResolution(TEXT_RES);
  return t;
};

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#bfe6f2',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER, // the stage already fills the container
      width: parent.offsetWidth || window.innerWidth,
      height: parent.offsetHeight || window.innerHeight,
      resizeInterval: 120,
    },
    input: { activePointers: 2, touch: { capture: true } },
    scene: [MainScene, TownScene, CafeScene, OrchardScene, MatchaMastersScene, StellarFishingScene, CraneCrazeScene, PlatformerScene],
  });
  createManager(game);
  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __phaser: Phaser.Game }).__phaser = game; // test hooks
    (window as unknown as { __bus: typeof gameBus }).__bus = gameBus;
  }
  return game;
}
