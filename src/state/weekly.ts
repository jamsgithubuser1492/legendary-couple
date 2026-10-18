/**
 * Weekly couple goal, streak ladder and the weekly recap. Pure helpers: the store applies the rewards.
 *
 * Coins stay tied to real effort: the weekly goal needs the other partner to confirm each tick, only one tick counts
 * per day, and every reward pays once.
 */
import type { GameState } from '../types';
import { dateKey, prevKey, streakOf } from './questions';

export const WEEKLY_REWARD = { coins: 100, gems: 5, shells: 8, xp: 25 };
export const WEEKLY_BANNER_MS = 3 * 24 * 3600 * 1000; // the Weekly Memory Banner flies over the Town Square for three days
export const RECAP_REWARD = { coins: 20, shells: 2 };
export const FREEZES_PER_MONTH = 1;

/** Streak rungs: the Synergy Lantern burns warmer as the check in streak grows. Each rung pays once per run. */
export interface Rung { days: number; coins: number; gems: number; tokens?: number; shells?: number; figure?: string; label: string }
export const LADDER: readonly Rung[] = [
  { days: 3, coins: 25, gems: 1, label: 'Warming up' },
  { days: 7, coins: 50, gems: 2, tokens: 1, label: 'One week' },
  { days: 14, coins: 100, gems: 3, shells: 10, label: 'Two weeks' },
  { days: 30, coins: 250, gems: 6, figure: 'fig_golden_kitty', label: 'One month' },
  { days: 50, coins: 300, gems: 10, label: 'Fifty days' },
  { days: 100, coins: 500, gems: 20, label: 'One hundred days' },
];
export const rungPrize = (r: Rung) => [r.tokens ? `${r.tokens} arcade token` : '', r.shells ? `${r.shells} shells` : '', r.figure ? 'a Golden Kitty figure' : ''].filter(Boolean).join(' and ');

/** The lantern's flame: pastel blue, soft pink, golden sparkle, then a rainbow aura. */
export const lanternTier = (streak: number): 0 | 1 | 2 | 3 | 4 => (streak < 1 ? 0 : streak < 7 ? 1 : streak < 14 ? 2 : streak < 30 ? 3 : 4);

export const SURPRISE_COST = 10; // the sender's stake
export const SURPRISE_PAY = { coins: 30, shells: 4, xp: 10 }; // shared wallet, so +20 net for a kind act
export const SURPRISE_DELAY_MS = 15 * 60 * 1000; // a surprise takes at least a little while to do
export const SURPRISE_IDEAS = [
  'Make coffee or matcha in the morning',
  'Leave a sweet sticky note where they will find it',
  'Bring home their favorite treat',
  'Run them a warm bath or pour a tea',
  'Plan a ten minute dance break',
  'Tell them three things you love about them, out loud',
];

export const GOAL_PRESETS: { title: string; target: number; area: string }[] = [
  { title: 'Go on date nights', target: 2, area: '💕 Romance' },
  { title: 'Cook home meals together', target: 3, area: '🌿 Health' },
  { title: 'Take evening sunset walks', target: 3, area: '🌿 Health' },
  { title: 'Phone free dinners', target: 3, area: '🤝 Connection' },
  { title: 'Try something new together', target: 1, area: '🌱 Growth' },
  { title: 'Plan a future dream together', target: 1, area: '🏡 Home' },
];

const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (key: string, n: number) => {
  const d = parse(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};

/** The Monday of the week that holds this date. */
export function mondayOf(day = dateKey()): string {
  const d = parse(day);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return dateKey(d);
}
export const weekDays = (wk: string) => Array.from({ length: 7 }, (_, i) => addDays(wk, i));
export const nextWeekKey = (day = dateKey()) => addDays(mondayOf(day), 7);
export const isSunday = (day = dateKey()) => parse(day).getDay() === 0;
export const lastWeekKey = (day = dateKey()) => addDays(mondayOf(day), -7);

export const progressOf = (g?: GameState['weekly'][string]) => (g ? g.ticks.filter((t) => t.ok).length : 0);

/** Next rung above a streak, for the ladder display. */
export const nextRung = (n: number) => LADDER.find((r) => r.days > n);

export interface Recap {
  week: string;
  checkins: number;
  goals: number;
  notes: number;
  memories: number;
  whispers: number;
  bids: number;
  goal?: GameState['weekly'][string];
  quote?: { from: 'A' | 'B'; text: string };
}

export function recapOf(s: GameState, wk: string): Recap {
  const days = weekDays(wk);
  const set = new Set(days);
  const lo = parse(wk).getTime();
  const hi = lo + 7 * 86400000;
  const notes = s.gratitude.filter((n) => set.has(n.day));
  const last = notes[notes.length - 1];
  return {
    week: wk,
    checkins: days.filter((d) => s.checkins[d]?.paid).length,
    goals: days.reduce((n, d) => n + (s.questDays[d]?.length ?? 0), 0),
    notes: notes.length,
    memories: s.memories.filter((m) => m.date >= lo && m.date < hi).length,
    whispers: days.filter((d) => s.whispers[d]?.A && s.whispers[d]?.B).length,
    bids: 0,
    goal: s.weekly[wk],
    quote: last ? { from: last.from, text: last.text } : undefined,
  };
}

/** A week with nothing in it has no recap to look back on, so it pays nothing. */
export const hasActivity = (r: Recap) => r.checkins + r.goals + r.notes + r.memories + r.whispers + progressOf(r.goal) > 0;

export { prevKey };

/** The current check in streak, counting any days a Grace Shield saved. */
export const streakNow = (s: GameState) => streakOf(s.checkins, dateKey(), s.ladder.frozen);
