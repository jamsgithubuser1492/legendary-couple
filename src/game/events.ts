import Phaser from 'phaser';
import type { StartingPath } from '../types';
import { getState, setStartingPath } from '../state/store';

/** Tiny bridge between React and Phaser. */
export const gameBus = new Phaser.Events.EventEmitter();

export const BUS = {
  startingPath: 'startingPath', // React -> Phaser: StartingPath | null
  center: 'center',             // React -> Phaser
  zoom: 'zoom',                 // React -> Phaser: delta number
  edit: 'edit',                 // React -> Phaser: EditPayload
  focus: 'focus',               // React -> Phaser: {x, y} pan the camera to a tile
  memoryOpen: 'memoryOpen',     // Phaser -> React: memory id
  view: 'view',                 // React -> Phaser: 'island' | 'town'
  townToast: 'townToast',       // Phaser -> React: { text }
  viewSync: 'viewSync',         // Phaser -> React: the scene changed the view itself
  hover: 'hover',               // Phaser -> React: {x, y} | null
} as const;

export type EditPayload = { active: boolean; mode: 'place' | 'remove'; itemId: string | null; rotation: 0 | 90 | 180 | 270 };
export type HoverPayload = { x: number; y: number } | null;
export type PathPayload = StartingPath | null;

export const loadStartingPath = (): StartingPath | null => getState().startingPath;
export const saveStartingPath = (p: StartingPath): void => setStartingPath(p);
