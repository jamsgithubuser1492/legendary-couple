import { describe, expect, it } from 'vitest';
import { merge3 } from './merge';

const base = {
  coins: 1000, gems: 10, mgBest: { fish: 5 }, islandSize: 10, glowUntil: 0,
  names: { A: 'James', B: 'Rachel' },
  quests: [{ id: 'q1', status: 'IN_PROGRESS' }, { id: 'q2', status: 'IN_PROGRESS' }],
  placed: [{ id: 'p1', x: 1 }],
  inventory: [{ id: 'chair', count: 2 }],
  messages: [{ id: 'm1', ts: 1 }],
  recipes: ['latte'], avatars: { A: { x: 1, y: 1 }, B: { x: 2, y: 2 } },
  fauna: { shark: 1 }, today: { day: '2026-10-21', questCoins: 40, quests: 1 },
  cafe: { latte: { day: '2026-10-21', n: 1, best: 3 }, rushes: 0, popularity: 1 },
};
type S = typeof base;
const c = (): S => JSON.parse(JSON.stringify(base));

describe('merge3', () => {
  it('takes the other side when only one changed', () => {
    const a = c(); a.coins = 900;
    expect(merge3(base, a, base).coins).toBe(900);
    expect(merge3(base, base, a).coins).toBe(900);
  });
  it('adds both phones spending (counters)', () => {
    const a = c(), b = c(); a.coins -= 100; b.coins -= 250; b.gems += 3;
    const m = merge3(base, a, b);
    expect(m.coins).toBe(650);
    expect(m.gems).toBe(13);
  });
  it('never lets a counter go below zero', () => {
    const a = c(), b = c(); a.coins = 0; b.coins = 0;
    a.coins = 0; b.coins = 0; a.gems = 0; b.gems = 0;
    expect(merge3(base, a, b).gems).toBe(0);
  });
  it('keeps both approvals of different quests', () => {
    const a = c(), b = c(); a.quests[0].status = 'APPROVED'; b.quests[1].status = 'APPROVED';
    const m = merge3(base, a, b);
    expect(m.quests.map((q) => q.status)).toEqual(['APPROVED', 'APPROVED']);
  });
  it('keeps both phones placing furniture', () => {
    const a = c(), b = c(); a.placed.push({ id: 'p2', x: 2 }); b.placed.push({ id: 'p3', x: 3 });
    expect(merge3(base, a, b).placed.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
  });
  it('removes an item deleted on one side and untouched on the other', () => {
    const a = c(); a.placed = [];
    expect(merge3(base, a, c()).placed).toEqual([]);
    const b = c(); b.placed[0].x = 9;
    expect(merge3(base, a, b).placed).toEqual([{ id: 'p1', x: 9 }]);
  });
  it('adds inventory counts from two phones', () => {
    const a = c(), b = c(); a.inventory[0].count = 1; b.inventory[0].count = 5; // -1 and +3
    expect(merge3(base, a, b).inventory[0].count).toBe(4);
  });
  it('unions messages by id and sorts them', () => {
    const a = c(), b = c(); a.messages.push({ id: 'm3', ts: 3 }); b.messages.push({ id: 'm2', ts: 2 });
    expect(merge3(base, a, b).messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });
  it('rolls the day over: the newer day replaces the older counters', () => {
    const a = c(), b = c(); a.today = { day: '2026-10-22', questCoins: 5, quests: 1 }; b.today.questCoins = 80;
    expect(merge3(base, a, b).today).toEqual({ day: '2026-10-22', questCoins: 5, quests: 1 });
  });
  it('adds same day counters from both phones', () => {
    const a = c(), b = c(); a.today.questCoins = 70; b.today.questCoins = 55; a.today.quests = 2; b.today.quests = 2;
    const m = merge3(base, a, b);
    expect(m.today.questCoins).toBe(85);
    expect(m.today.quests).toBe(3);
  });
  it('merges sets of strings', () => {
    const a = c(), b = c(); a.recipes.push('mocha'); b.recipes.push('boba');
    expect(merge3(base, a, b).recipes.sort()).toEqual(['boba', 'latte', 'mocha']);
    const x = c(); x.recipes = [];
    expect(merge3(base, x, b).recipes).toEqual(['boba']);
  });
  it('lets each partner move their own avatar', () => {
    const a = c(), b = c(); a.avatars.A = { x: 5, y: 5 }; b.avatars.B = { x: 7, y: 7 };
    expect(merge3(base, a, b).avatars).toEqual({ A: { x: 5, y: 5 }, B: { x: 7, y: 7 } });
  });
  it('takes the larger value for times, sizes and best scores', () => {
    const a = c(), b = c(); a.islandSize = 12; b.islandSize = 14; a.glowUntil = 5; b.glowUntil = 9; a.mgBest.fish = 8; b.mgBest.fish = 7;
    const m = merge3(base, a, b);
    expect([m.islandSize, m.glowUntil, m.mgBest.fish]).toEqual([14, 9, 8]);
  });
  it('the server value stands when both phones changed the same plain value', () => {
    const a = c(), b = c(); a.names.A = 'Jim'; b.names.A = 'Jimmy';
    expect(merge3(base, a, b).names.A).toBe('Jimmy');
  });
  it('adds map counters such as fauna and a new key', () => {
    const a = c(), b = c(); a.fauna.shark = 3; b.fauna.shark = 2; (a.fauna as Record<string, number>).crab = 1;
    expect(merge3(base, a, b).fauna).toEqual({ shark: 4, crab: 1 });
  });
  it('adds cafe counters', () => {
    const a = c(), b = c(); a.cafe.rushes = 1; b.cafe.rushes = 1; a.cafe.popularity = 2; b.cafe.popularity = 3;
    const m = merge3(base, a, b);
    expect(m.cafe.rushes).toBe(2);
    expect(m.cafe.popularity).toBe(4);
  });
  it('does not touch its inputs', () => {
    const a = c(), b = c(); a.coins = 1; const snap = JSON.stringify(a);
    merge3(base, a, b);
    expect(JSON.stringify(a)).toBe(snap);
  });
});
