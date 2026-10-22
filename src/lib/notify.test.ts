import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, Quest } from '../types';
import { dateKey } from '../state/questions';
import { mondayOf } from '../state/weekly';
import { createNotifier, DAILY_MAX, DEBOUNCE_MS, KIND_GAP_MS, type Deps } from './notify';

vi.mock('../state/store', () => ({ getMe: () => 'A', getState: () => ({}), onStateChange: () => () => undefined }));
vi.mock('./sync', () => ({ getRoom: () => 'ROOM1' }));
vi.mock('./push', () => ({ notifyPartner: () => undefined }));

const quiet = { names: { A: 'James', B: 'Rachel' }, quests: [], checkins: {}, whispers: {}, pendingBox: null, surprises: [], weekly: {}, cafe: { event: null } } as unknown as GameState;
const withQuest = (id: string, extra: Partial<Quest> = {}): GameState => ({ ...quiet, quests: [...quiet.quests, { id, title: 't', area: 'health', assignedTo: 'A', status: 'PENDING_VERIFICATION', reward: { coins: 1, gems: 0 }, createdAt: 0, ...extra } as Quest] });

function setup(room: string | null = 'ROOM1') {
  let t = Date.parse('2026-10-21T12:00:00Z');
  let log: { ts: number; kind: never }[] = [];
  const send = vi.fn();
  const deps: Deps = { now: () => t, room: () => room, me: () => 'A', send, load: () => log as never, save: (l) => { log = l as never; } };
  return { send, deps, advance: (ms: number) => { t += ms; }, log: () => log };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createNotifier', () => {
  it('sends exactly one call for a newly pending quest', () => {
    const { send, deps } = setup();
    const n = createNotifier(deps, quiet);
    n.onChange(withQuest('q1'), true);
    n.onChange(withQuest('q1'), true); // a second change with the same item adds nothing
    vi.advanceTimersByTime(DEBOUNCE_MS + 10);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('approve', 'James finished something. Take a look when you can.');
  });
  it('waits for the debounce and stays silent when nothing is new', () => {
    const { send, deps } = setup();
    const n = createNotifier(deps, quiet);
    n.onChange(quiet, true);
    vi.advanceTimersByTime(DEBOUNCE_MS + 10);
    expect(send).not.toHaveBeenCalled();
    n.onChange(withQuest('q1'), true);
    vi.advanceTimersByTime(DEBOUNCE_MS - 100);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('never notifies for items that were already waiting, or that arrive from the partner phone', () => {
    const { send, deps } = setup();
    const n = createNotifier(deps, withQuest('old'));
    n.onChange(withQuest('old'), true);
    n.onChange(withQuest('remote'), false);
    vi.advanceTimersByTime(DEBOUNCE_MS + 10);
    expect(send).not.toHaveBeenCalled();
  });
  it('collapses several new things into one message', () => {
    const { send, deps } = setup();
    const n = createNotifier(deps, quiet);
    n.onChange(withQuest('q1'), true);
    n.onChange({ ...withQuest('q1'), pendingBox: { by: 'A' } } as GameState, true);
    vi.advanceTimersByTime(DEBOUNCE_MS + 10);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe('multi');
    expect(send.mock.calls[0][1]).toContain('2 things');
  });
  it('allows one push per kind in three hours', () => {
    const { send, deps, advance } = setup();
    const n = createNotifier(deps, quiet);
    n.onChange(withQuest('q1'), true);
    vi.advanceTimersByTime(DEBOUNCE_MS + 10);
    n.onChange(quiet, true);
    n.onChange(withQuest('q2'), true);
    vi.advanceTimersByTime(DEBOUNCE_MS + 10);
    expect(send).toHaveBeenCalledTimes(1);
    advance(KIND_GAP_MS + 1000);
    n.onChange(quiet, true);
    n.onChange(withQuest('q3'), true);
    vi.advanceTimersByTime(DEBOUNCE_MS + 10);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it('stops at six a day', () => {
    const { send, deps } = setup();
    const n = createNotifier(deps, quiet);
    const today = dateKey();
    const wk = mondayOf(today);
    // seven different kinds, one after another inside the same day
    const steps: Partial<GameState>[] = [
      { quests: withQuest('q1').quests },
      { checkins: { [today]: { A: 'hi' } } },
      { whispers: { w: { tier: 'light', q: '?', A: 'x' } } },
      { pendingBox: { by: 'A' } },
      { surprises: [{ id: 's', from: 'A', to: 'B', act: 'a', ts: 0 }] },
      { weekly: { [wk]: { title: 'w', target: 3, by: 'A', ticks: [{ day: today, by: 'A' }] } } },
      { cafe: { event: { day: today, id: 'study', by: 'A', joined: false } } as unknown as GameState['cafe'] },
    ];
    let s2 = quiet;
    for (const step of steps) {
      s2 = { ...s2, ...step } as GameState;
      n.onChange(s2, true);
      vi.advanceTimersByTime(DEBOUNCE_MS + 10);
    }
    expect(send).toHaveBeenCalledTimes(DAILY_MAX);
  });
  it('does nothing when there is no room (solo)', () => {
    const { send, deps } = setup(null);
    const n = createNotifier(deps, quiet);
    n.onChange(withQuest('q1'), true);
    vi.advanceTimersByTime(DEBOUNCE_MS + 10);
    expect(send).not.toHaveBeenCalled();
  });
});
