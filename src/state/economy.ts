/**
 * The economy in one place. The goal: rewards that feel good, but that you cannot farm by going through the motions.
 *
 * A comfortable day (3 to 4 real goals, a check in, a game or two) earns about 100 to 160 coins.
 * Prices then land like this: small items about one day, mid pieces two to four days, big pieces
 * (greenhouse, gazebo, piano) one to two weeks, the 2,500 coin island about five weeks.
 */
export const START_COINS = 2000; // the wallet is shared, so this is 1,000 for each of you

// ---- quests ----
export const DAILY_QUEST_COINS = 180; // full pay up to this many quest coins a day...
export const OVER_CAP_SHARE = 0.25; // ...then a quarter. Growth and streaks still count in full
export const DAILY_TOKENS = 3; // arcade tokens from quests, per day
export const REWARD_MAX = 60; // coins a normal quest can pay
export const MILESTONE_MAX = 150; // coins a milestone quest can pay
export const SELF_MAX = { coins: 30, gems: 3 }; // a quest you set for yourself pays less than one your partner sets for you

// ---- together ----
export const DUO_DAY_COINS = 20; // when you both get a goal approved on the same day
export const DUO_DAY_SHELLS = 2;

// ---- games and extras ----
export const MG_COINS_PER_GAME = 120;
export const DAILY_MG_COINS = 240;
export const DAILY_WELL_TOSSES = 3;

export interface DayStats {
  day: string;
  questCoins: number; // paid quest coins today
  quests: number; // approvals today
  tokens: number;
  mgCoins: number;
  wells: number;
  duoPaid: boolean;
}
export const emptyDay = (day: string): DayStats => ({ day, questCoins: 0, quests: 0, tokens: 0, mgCoins: 0, wells: 0, duoPaid: false });

/** Clamps a reward to what its creator is allowed to set. */
export function clampReward<R extends { coins: number; gems: number; itemId?: string; blindBoxes?: number }>(r: R, o: { milestone?: boolean; self: boolean }): R {
  const max = o.milestone ? MILESTONE_MAX : REWARD_MAX;
  const coins = Math.min(max, Math.max(0, Math.round(r.coins)));
  if (!o.self) return { ...r, coins, gems: Math.min(25, Math.max(0, Math.round(r.gems))) };
  return { ...r, coins: Math.min(coins, SELF_MAX.coins), gems: Math.min(SELF_MAX.gems, Math.max(0, Math.round(r.gems))), itemId: undefined, blindBoxes: undefined };
}
