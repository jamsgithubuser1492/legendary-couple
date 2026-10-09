import { useSyncExternalStore } from 'react';

export type Theme = 'spring' | 'summer' | 'autumn' | 'winter' | 'holidays';
export type SeasonChoice = 'auto' | Theme;

export const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'spring', label: 'Spring', icon: '🌸' },
  { id: 'summer', label: 'Summer', icon: '☀️' },
  { id: 'autumn', label: 'Autumn', icon: '🍂' },
  { id: 'winter', label: 'Winter', icon: '❄️' },
  { id: 'holidays', label: 'Holidays', icon: '🎄' },
];

/** Reads the real calendar. Dec 1 to Jan 6 is Holidays, otherwise the meteorological season. */
export function themeForDate(d: Date): Theme {
  const m = d.getMonth(); // 0 = Jan
  const day = d.getDate();
  if ((m === 11 && day >= 1) || (m === 0 && day <= 6)) return 'holidays';
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

const KEY = 'olw:seasonChoice';
let choice: SeasonChoice = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.some((t) => t.id === v) ? (v as Theme) : 'auto';
  } catch {
    return 'auto';
  }
})();
const listeners = new Set<() => void>();

export const getSeasonChoice = () => choice;
export const getTheme = (): Theme => (choice === 'auto' ? themeForDate(new Date()) : choice);

/** Lets you preview another season. Stays on this device only. */
export function setSeasonChoice(c: SeasonChoice) {
  choice = c;
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const onThemeChange = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const subscribe = (l: () => void) => onThemeChange(l);
export const useTheme = () => useSyncExternalStore(subscribe, getTheme);
export const useSeasonChoice = () => useSyncExternalStore(subscribe, getSeasonChoice);

export interface Palette {
  sky: number;
  skyCss: string;
  grassA: number;
  grassB: number;
  sand: number;
  sandEdge: number;
  waterRing: number;
}

export const PALETTES: Record<Theme, Palette> = {
  spring: { sky: 0xbfe6f2, skyCss: '#bfe6f2', grassA: 0xc4eeb4, grassB: 0xb8e6a8, sand: 0xf6e3b8, sandEdge: 0xe7cf9c, waterRing: 0xaedcec },
  summer: { sky: 0x9fdcf0, skyCss: '#9fdcf0', grassA: 0xb4e89a, grassB: 0xa6df8a, sand: 0xf8e2a8, sandEdge: 0xe9cd8c, waterRing: 0x86cde6 },
  autumn: { sky: 0xcfe4e6, skyCss: '#cfe4e6', grassA: 0xe2dca0, grassB: 0xd6cf90, sand: 0xf2dcb4, sandEdge: 0xdcc596, waterRing: 0xb4d3d8 },
  winter: { sky: 0xd4e4f0, skyCss: '#d4e4f0', grassA: 0xf1f7fb, grassB: 0xe4eff7, sand: 0xf3eee6, sandEdge: 0xdcd6cc, waterRing: 0xbcd3e6 },
  holidays: { sky: 0xc9dbee, skyCss: '#c9dbee', grassA: 0xf1f7fb, grassB: 0xe4eff7, sand: 0xf3eee6, sandEdge: 0xdcd6cc, waterRing: 0xb2cbe2 },
};
