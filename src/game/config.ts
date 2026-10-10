import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { TownScene } from './scenes/TownScene';
import { gameBus } from './events';
import { createManager } from './minigames/MinigameManager';
import { OrchardScene } from './minigames/OrchardScene';
import { MatchaMastersScene } from './minigames/MatchaMastersScene';
import { StellarFishingScene } from './minigames/StellarFishingScene';
import { CraneCrazeScene } from './minigames/CraneCrazeScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#bfe6f2',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
    input: { activePointers: 2, touch: { capture: true } },
    scene: [MainScene, TownScene, OrchardScene, MatchaMastersScene, StellarFishingScene, CraneCrazeScene],
  });
  createManager(game);
  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __phaser: Phaser.Game }).__phaser = game; // test hooks
    (window as unknown as { __bus: typeof gameBus }).__bus = gameBus;
  }
  return game;
}
