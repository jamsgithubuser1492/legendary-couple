import { describe, expect, it } from 'vitest';
import type { GameState, Quest } from '../types';
import { waitingFor } from './waiting';
import { mondayOf } from './weekly';

const DAY = '2026-10-21';
const base = (): GameState => ({
  names: { A: 'James', B: 'Rachel' }, quests: [], checkins: {}, whispers: {}, pendingBox: null, surprises: [], weekly: {}, cafe: { event: null },
} as unknown as GameState);
const quest = (o: Partial<Quest>): Quest => ({ id: 'q1', title: 't', area: 'health', assignedTo: 'A', status: 'IN_PROGRESS', reward: { coins: 1, gems: 0 }, createdAt: 0, ...o } as Quest);

describe('waitingFor', () => {
  it('is empty on a quiet day', () => {
    expect(waitingFor(base(), 'A', DAY)).toEqual([]);
    expect(waitingFor(base(), 'B', DAY)).toEqual([]);
  });
  it('asks the other partner to approve a finished quest, never the one who did it', () => {
    const s = { ...base(), quests: [quest({ status: 'PENDING_VERIFICATION', assignedTo: 'A' })] };
    expect(waitingFor(s, 'B', DAY).map((w) => w.kind)).toEqual(['approve']);
    expect(waitingFor(s, 'A', DAY)).toEqual([]);
    expect(waitingFor(s, 'B', DAY)[0].id).toBe('approve:q1');
  });
  it('ignores quests that are in progress, approved or rejected', () => {
    for (const status of ['IN_PROGRESS', 'APPROVED', 'REJECTED'] as const) expect(waitingFor({ ...base(), quests: [quest({ status })] }, 'B', DAY)).toEqual([]);
  });
  it('flags the daily question when only the partner answered', () => {
    const s = { ...base(), checkins: { [DAY]: { A: 'hi' } } };
    expect(waitingFor(s, 'B', DAY).map((w) => w.kind)).toEqual(['daily']);
    expect(waitingFor(s, 'A', DAY)).toEqual([]);
    expect(waitingFor({ ...s, checkins: { [DAY]: { A: 'hi', B: 'yo' } } }, 'B', DAY)).toEqual([]);
  });
  it('flags a whisper the partner answered', () => {
    const s = { ...base(), whispers: { w1: { tier: 'light', q: '?', A: 'x' } } } as unknown as GameState;
    expect(waitingFor(s, 'B', DAY).map((w) => w.kind)).toEqual(['whisper']);
    expect(waitingFor(s, 'A', DAY)).toEqual([]);
  });
  it('flags a blind box request from the partner only', () => {
    const s = { ...base(), pendingBox: { by: 'A' as const } };
    expect(waitingFor(s, 'B', DAY).map((w) => w.kind)).toEqual(['box']);
    expect(waitingFor(s, 'A', DAY)).toEqual([]);
  });
  it('flags a surprise set for you until it is done', () => {
    const sur = { id: 's1', from: 'A' as const, to: 'B' as const, act: 'a', ts: 0 };
    expect(waitingFor({ ...base(), surprises: [sur] }, 'B', DAY).map((w) => w.kind)).toEqual(['surprise']);
    expect(waitingFor({ ...base(), surprises: [sur] }, 'A', DAY)).toEqual([]);
    expect(waitingFor({ ...base(), surprises: [{ ...sur, doneAt: 5 }] }, 'B', DAY)).toEqual([]);
  });
  it('flags a weekly tick that needs your confirmation', () => {
    const wk = mondayOf(DAY);
    const goal = { title: 'walk', target: 3, by: 'A' as const, ticks: [{ day: DAY, by: 'A' as const }] };
    const s = { ...base(), weekly: { [wk]: goal } };
    expect(waitingFor(s, 'B', DAY).map((w) => w.id)).toEqual([`weekly:${wk}:${DAY}`]);
    expect(waitingFor(s, 'A', DAY)).toEqual([]);
    expect(waitingFor({ ...s, weekly: { [wk]: { ...goal, ticks: [{ day: DAY, by: 'A' as const, ok: true }] } } }, 'B', DAY)).toEqual([]);
    expect(waitingFor({ ...s, weekly: { [wk]: { ...goal, paid: true } } }, 'B', DAY)).toEqual([]);
  });
  it('flags a café event someone else hosts today', () => {
    const ev = { day: DAY, id: 'study', by: 'A' as const, joined: false };
    const s = { ...base(), cafe: { event: ev } } as unknown as GameState;
    expect(waitingFor(s, 'B', DAY).map((w) => w.kind)).toEqual(['event']);
    expect(waitingFor(s, 'A', DAY)).toEqual([]);
    expect(waitingFor({ ...s, cafe: { event: { ...ev, joined: true } } } as unknown as GameState, 'B', DAY)).toEqual([]);
    expect(waitingFor({ ...s, cafe: { event: { ...ev, day: '2026-10-20' } } } as unknown as GameState, 'B', DAY)).toEqual([]);
  });
  it('uses warm wording with no dashes', () => {
    const s = { ...base(), quests: [quest({ status: 'PENDING_VERIFICATION' })], checkins: { [DAY]: { A: 'x' } }, pendingBox: { by: 'A' as const } };
    for (const w of waitingFor(s, 'B', DAY)) expect(w.text).not.toMatch(/[-–—]/);
  });
});
