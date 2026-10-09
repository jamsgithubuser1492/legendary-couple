import Phaser from 'phaser';
import type { StartingPath } from '../types';

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

const KEY = 'olw:startingPath';

export function loadStartingPath(): StartingPath | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'rv' || v === 'shop' || v === 'home' ? v : null;
  } catch {
    return null;
  }
}

export function saveStartingPath(p: StartingPath): void {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* storage unavailable, ignore */
  }
}
