/**
 * Weekly couple goal, streak ladder and the weekly recap. Pure helpers: the store applies the rewards.
 *
 * Coins stay tied to real effort: the weekly goal needs the other partner to confirm each tick, only one tick counts
 * per day, and every reward pays once.
 */
import type { GameState } from '../types';
import { dateKey, prevKey } from './questions';

export const WEEKLY_REWARD = { coins: 60, gems: 4, shells: 3, xp: 20 };
export const RECAP_REWARD = { coins: 20, shells: 2 };
export const FREEZES_PER_MONTH = 1;

/** Streak rungs: the check in streak pays a bonus the first time each is reached in a run. */
export const LADDER = [
  { days: 3, coins: 20, gems: 1, label: 'Warming up' },
  { days: 7, coins: 40, gems: 2, label: 'One week' },
  { days: 14, coins: 70, gems: 3, label: 'Two weeks' },
  { days: 30, coins: 150, gems: 6, label: 'One month' },
  { days: 50, coins: 250, gems: 10, label: 'Fifty days' },
  { days: 100, coins: 500, gems: 20, label: 'One hundred days' },
] as const;

export const GOAL_PRESETS: { title: string; target: number }[] = [
  { title: 'Go on date nights', target: 2 },
  { title: 'Take a walk together', target: 3 },
  { title: 'Cook a meal together', target: 2 },
  { title: 'Phone free dinner', target: 3 },
  { title: 'Try something new together', target: 1 },
  { title: 'Move our bodies together', target: 3 },
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
