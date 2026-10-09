import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { TownScene } from './scenes/TownScene';

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
    scene: [MainScene, TownScene],
  });
  if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __phaser: Phaser.Game }).__phaser = game; // test hook
  return game;
}
