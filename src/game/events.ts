import Phaser from 'phaser';
import type { StartingPath } from '../types';
import { getState, setStartingPath } from '../state/store';

/** Tiny bridge between React and Phaser. */
export const gameBus = new Phaser.Events.EventEmitter();

export const BUS = {
  startingPath: 'startingPath', // React -> Phaser: StartingPath | null
  center: 'center',             // React -> Phaser
  zoom: 'zoom',                 // React -> Phaser: delta number
  hover: 'hover',               // Phaser -> React: {x, y} | null
} as const;

export type HoverPayload = { x: number; y: number } | null;
export type PathPayload = StartingPath | null;

export const loadStartingPath = (): StartingPath | null => getState().startingPath;
export const saveStartingPath = (p: StartingPath): void => setStartingPath(p);
