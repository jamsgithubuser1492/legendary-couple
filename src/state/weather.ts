import type { Theme } from './season';

/** The rules for the weather on the world maps. Pure, so they can be tested and both phones get the same answer. */
export type Weather = 'clear' | 'rain' | 'snow';
export type WeatherChoice = 'auto' | Weather;

/** A steady number from 0 to 1 for a day, so both phones agree without talking to each other. */
function dayRoll(d: Date, salt: string): number {
  const day = `${salt}${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * The same weather for both phones: a hash of the local date and the REAL season (not a previewed one), unless you chose
 * one. Winter and the holidays get light snow on about two days in three. Spring and autumn are rainy about a day in
 * three, summer has a brief warm shower on a few afternoons, and a mild winter day can rarely bring rain instead of snow.
 */
export function weatherRule(d: Date, theme: Theme, choice: WeatherChoice = 'auto'): Weather {
  if (choice !== 'auto') return choice;
  const r = dayRoll(d, 'w');
  if (theme === 'holidays') return r < 0.65 ? 'snow' : 'clear';
  if (theme === 'winter') return r < 0.6 ? 'snow' : r < 0.65 ? 'rain' : 'clear';
  if (theme === 'spring' || theme === 'autumn') return r < 0.3 ? 'rain' : 'clear';
  const h = d.getHours();
  return r < 0.08 && h >= 13 && h < 19 ? 'rain' : 'clear';
}

/** Real fireflies: June to August every clear evening, and some evenings from late May and in early September. */
export function firefliesInSeason(d: Date): boolean {
  const m = d.getMonth(), day = d.getDate();
  if (m >= 5 && m <= 7) return true;
  if ((m === 4 && day >= 25) || (m === 8 && day <= 7)) return dayRoll(d, 'f') < 0.5;
  return false;
}

/** How visible the swarms are at this hour: they come out from 7 pm, are at their best by 9, and are gone by 5 am. */
export function fireflyFade(h: number): number {
  if (h >= 21 || h < 4) return 1;
  if (h >= 19) return (h - 19) / 2;
  if (h < 5) return 5 - h;
  return 0;
}
