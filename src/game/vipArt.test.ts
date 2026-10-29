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
    expect(vipVariant('miffy', 'miffy_raincoat')).toBe('yellow');
    expect(vipVariant('miffy', 'miffy_sweater')).toBe('blue');
    expect(vipVariant('miffy', undefined)).toBe('blue');
    expect(vipVariant('snoopy', 'snoopy_o2')).toBe('olive');
    expect(vipVariant('snoopy', undefined)).toBe('olive');
    expect(vipVariant('snoopy', 'something_else')).toBe('plain');
  });
  it('keys need every walk frame, optional art falls back', () => {
    const all = (k: string) => k.startsWith('vip_');
    expect(vipKeys('kitty', 'plaid', all)?.down).toHaveLength(4);
    expect(vipKeys('kitty', 'green', all)?.up[0]).toBe('vip_kitty_green_walk_b_1'); // the green look now has its own back view
    expect(vipKeys('kitty', 'green', (k) => all(k) && !k.startsWith('vip_kitty_green_walk_b'))?.up).toEqual(vipKeys('kitty', 'green', (k) => all(k) && !k.startsWith('vip_kitty_green_walk_b'))?.down);
    expect(vipKeys('miffy', 'brown', all)?.sit).toEqual([]);
    expect(vipKeys('snoopy', 'olive', all)?.jump).toBe('vip_snoopy_jump_1');
    expect(vipKeys('snoopy', 'olive', (k) => k !== 'vip_snoopy_jump_1')?.jump).toBeNull();
    expect(vipKeys('kitty', 'plaid', (k) => k !== 'vip_kitty_walk_b_3')).toBeNull();
    expect(vipKeys('miffy', 'yellow', () => false)).toBeNull();
  });
  it('Miffy blue walks, sits on her own chair, jumps and waves, and falls back to her stills', () => {
    const all = (k: string) => k.startsWith('vip_');
    const blue = vipKeys('miffy', 'blue', all)!;
    expect(blue.down).toHaveLength(4);
    expect(blue.up).toHaveLength(4);
    expect(blue.sit).toEqual(['vip_miffy_blue_sit_1', 'vip_miffy_blue_sit_2']);
    expect(blue.sitHasChair).toBe(true);
    expect(blue.sitFaces).toBe('right');
    expect(blue.jump).toBe('vip_miffy_blue_jump_1');
    expect(blue.wave).toBe('vip_miffy_blue_wave_1');
    const noBlue = vipKeys('miffy', 'blue', (k) => k.startsWith('vip_miffy_yellow'))!; // blue art missing: the yellow stills, standing beside a table
    expect(noBlue.down).toEqual(['vip_miffy_yellow_f']);
    expect(noBlue.sit).toEqual([]);
    expect(noBlue.sitHasChair).toBe(false);
    expect(vipKeys('miffy', 'blue', (k) => k !== 'vip_miffy_blue_walk_b_2' && all(k) && !k.startsWith('vip_miffy_yellow'))).toBeNull();
  });
  it('green Hello Kitty gets a real back view, back hop and back wave, and falls back to the front frames', () => {
    const all = (k: string) => k.startsWith('vip_');
    const g = vipKeys('kitty', 'green', all)!;
    expect(g.up).toEqual(['1', '2', '3', '4'].map((n) => `vip_kitty_green_walk_b_${n}`));
    expect(g.sit).toEqual(['vip_kitty_green_sit_1', 'vip_kitty_green_sit_2']);
    expect(g.exitJump).toHaveLength(3);
    expect(g.waveFrames).toHaveLength(2);
    expect(g.sitHasChair).toBe(false);
    const noBack = vipKeys('kitty', 'green', (k) => all(k) && !k.startsWith('vip_kitty_green_walk_b'))!;
    expect(noBack.up).toEqual(noBack.down);
    expect(noBack.exitJump).toEqual([]);
    expect(noBack.waveFrames).toEqual([]);
    const noSit = vipKeys('kitty', 'green', (k) => all(k) && !k.startsWith('vip_kitty_green_sit'))!;
    expect(noSit.sit).toEqual(['vip_kitty_sit_1', 'vip_kitty_sit_2']);
    expect(vipKeys('kitty', 'plaid', all)!.exitJump).toEqual([]);
  });
  it('Snoopy walks left facing, plain Snoopy has his own set, and everything falls back', () => {
    const all = (k: string) => k.startsWith('vip_');
    expect(vipKeys('snoopy', 'olive', all)!.down[0]).toBe('vip_snoopy_walkl_1');
    expect(vipKeys('snoopy', 'olive', (k) => all(k) && !k.startsWith('vip_snoopy_walkl'))!.down[0]).toBe('vip_snoopy_walk_1');
    const plain = vipKeys('snoopy', 'plain', all)!;
    expect(plain.down[0]).toBe('vip_snoopy_plain_walk_1');
    expect(plain.sit).toEqual(['vip_snoopy_plain_sit_1', 'vip_snoopy_plain_sit_2']);
    expect(plain.jump).toBe('vip_snoopy_plain_jump_1');
    expect(vipKeys('snoopy', 'plain', (k) => all(k) && k !== 'vip_snoopy_plain_sit_2')!.down[0]).toBe('vip_snoopy_walkl_1'); // an incomplete plain set uses the olive Snoopy
  });
  it('visits are spaced 8 to 15 minutes apart', () => {
    expect(nextVisitIn(0)).toBe(VISIT_MIN_S);
    expect(nextVisitIn(1)).toBe(VISIT_MAX_S);
    expect(nextVisitIn(0, true)).toBeLessThan(VISIT_MIN_S);
  });
});
