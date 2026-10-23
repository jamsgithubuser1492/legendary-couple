import { describe, expect, it } from 'vitest';
import { eligibleVips, nextVisitIn, vipIdOf, vipKeys, vipKind, vipVariant, VISIT_MAX_S, VISIT_MIN_S } from './vipArt';

const owner = (o: string) => ({ kitty_o1: 'kitty', kitty_o2: 'kitty', miffy_sweater: 'miffy', snoopy_o1: 'snoopy' } as Record<string, string>)[o];

describe('vip guests', () => {
  it('maps kinds both ways', () => {
    expect(vipKind('kitty')).toBe('vip_kitty');
    expect(vipIdOf('vip_snoopy')).toBe('snoopy');
    expect(vipIdOf('vip_dog')).toBeNull();
    expect(vipIdOf('student')).toBeNull();
    expect(vipIdOf(undefined)).toBeNull();
  });
  it('only owned or invited companions may visit', () => {
    expect(eligibleVips({ owned: [], invited: [] }, owner)).toEqual([]);
    expect(eligibleVips({ owned: ['kitty_o1'], invited: [] }, owner)).toEqual(['kitty']);
    expect(eligibleVips({ owned: [], invited: ['miffy'] }, owner)).toEqual(['miffy']);
    expect(eligibleVips({ owned: ['kitty_o1', 'miffy_sweater', 'snoopy_o1'], invited: [] }, owner)).toEqual(['kitty', 'miffy', 'snoopy']);
    expect(eligibleVips(undefined, owner)).toEqual([]);
  });
  it('wears the matching outfit when the sheet has one', () => {
    expect(vipVariant('kitty', 'kitty_o2')).toBe('green');
    expect(vipVariant('kitty', 'kitty_o1')).toBe('plaid');
    expect(vipVariant('kitty', 'outfit_kitty_winter')).toBe('plaid');
    expect(vipVariant('miffy', 'miffy_boots')).toBe('brown');
    expect(vipVariant('miffy', undefined)).toBe('yellow');
    expect(vipVariant('snoopy', 'snoopy_o2')).toBe('olive');
  });
  it('keys need every walk frame, optional art falls back', () => {
    const all = (k: string) => k.startsWith('vip_');
    expect(vipKeys('kitty', 'plaid', all)?.down).toHaveLength(4);
    expect(vipKeys('kitty', 'green', all)?.up).toEqual(vipKeys('kitty', 'green', all)?.down);
    expect(vipKeys('miffy', 'brown', all)?.sit).toEqual([]);
    expect(vipKeys('snoopy', 'olive', all)?.jump).toBe('vip_snoopy_jump_1');
    expect(vipKeys('snoopy', 'olive', (k) => k !== 'vip_snoopy_jump_1')?.jump).toBeNull();
    expect(vipKeys('kitty', 'plaid', (k) => k !== 'vip_kitty_walk_b_3')).toBeNull();
    expect(vipKeys('miffy', 'yellow', () => false)).toBeNull();
  });
  it('visits are spaced 8 to 15 minutes apart', () => {
    expect(nextVisitIn(0)).toBe(VISIT_MIN_S);
    expect(nextVisitIn(1)).toBe(VISIT_MAX_S);
    expect(nextVisitIn(0, true)).toBeLessThan(VISIT_MIN_S);
  });
});
