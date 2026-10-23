import { describe, expect, it } from 'vitest';
import { CREW } from '../state/crew';
import { SPRITES } from './spriteList';
import { levelOrder, loopLevel, loopReport, walkLoop, wobbleLoop, workScene, oopsSequence } from './crewArt';

const real = new Set<string>(SPRITES.map((s) => s.key));
const hasReal = (k: string) => real.has(k);
const def = (id: string) => CREW.find((c) => c.id === id)!;
const fake = (keys: string[]) => { const s = new Set(keys); return (k: string) => s.has(k); };
const frames = (base: string, n: number) => Array.from({ length: n }, (_, i) => `${base}_${i + 1}`);

describe('crew art lookup', () => {
  it('tries the same level first, then the nearest, lower first on a tie', () => {
    expect(levelOrder(1)).toEqual([1, 2, 3]);
    expect(levelOrder(2)).toEqual([2, 1, 3]);
    expect(levelOrder(3)).toEqual([3, 2, 1]);
  });

  it('keeps the outfit of the level while walking', () => {
    const has = fake([...frames('crewl_tan_2_walk_f', 4), ...frames('crewl_tan_3_walk_f', 4), ...frames('crewx_tan_walk_f', 4)]);
    expect(walkLoop(has, def('tan'), 'f', false, 3)[0]).toBe('crewl_tan_3_walk_f_1');
    expect(walkLoop(has, def('tan'), 'f', false, 2)[0]).toBe('crewl_tan_2_walk_f_1');
  });

  it('falls back to the nearest level, then to the older loops', () => {
    const has = fake([...frames('crewl_juno_2_walk_f', 4), ...frames('crewx_juno_walk_f', 4)]);
    expect(walkLoop(has, def('juno'), 'f', false, 3)[0]).toBe('crewl_juno_2_walk_f_1'); // no level 3 walk, level 2 is the nearest
    expect(walkLoop(has, def('juno'), 'b', false, 3)).toEqual([]); // nothing drawn for the back at any level
    const old = fake(frames('crewx_oren_walk_b', 4));
    expect(walkLoop(old, def('oren'), 'b', false, 2)[0]).toBe('crewx_oren_walk_b_1');
    expect(walkLoop(fake([]), def('oren'), 'b', false, 2)).toEqual([]);
  });

  it('carries a tray with the same level carry loop, and walks without one when only the walk exists', () => {
    const has = fake([...frames('crewl_pip_1_carry_f', 2), ...frames('crewl_pip_1_walk_f', 4)]);
    expect(walkLoop(has, def('pip'), 'f', true, 1)).toEqual(frames('crewl_pip_1_carry_f', 2));
    const walkOnly = fake(frames('crewl_pip_2_walk_f', 2));
    expect(walkLoop(walkOnly, def('pip'), 'f', true, 2)).toEqual(frames('crewl_pip_2_walk_f', 2));
  });

  it('reads the level from a loop key', () => {
    expect(loopLevel('crewl_tan_3_walk_f_2')).toBe(3);
    expect(loopLevel('crewx_tan_walk_f_2')).toBe(0);
  });

  it('plays a work scene from single frame views and wobbles only at the level it was drawn for', () => {
    const has = fake(['crewl_juno_1_work_fl_1', 'crewl_juno_1_work_fr_1', ...frames('crewl_tan_2_work_fl', 2), ...frames('crewl_pip_3_wobble', 4), ...frames('oops_hana_wobble', 4)]);
    expect(workScene(has, def('juno'), 1)?.frames).toEqual(['crewl_juno_1_work_fl_1', 'crewl_juno_1_work_fr_1']);
    expect(workScene(has, def('tan'), 3)?.frames).toEqual(frames('crewl_tan_2_work_fl', 2)); // nearest level
    expect(wobbleLoop(has, def('pip'), 3)).toEqual(frames('crewl_pip_3_wobble', 4));
    expect(wobbleLoop(has, def('pip'), 1)).toEqual([]);
    expect(wobbleLoop(has, def('hana'), 1)).toEqual(frames('oops_hana_wobble', 4));
    expect(wobbleLoop(has, def('hana'), 2)).toEqual([]);
  });
});

describe('the sprites that are cut', () => {
  const report = loopReport(hasReal, CREW);
  it('has a walk loop at the level for Tan, Pip, Juno and Ollie where the sheets drew one', () => {
    expect(report.tan[2].walk_f).toBeGreaterThanOrEqual(2);
    expect(report.tan[3].walk_b).toBeGreaterThanOrEqual(2);
    expect(report.pip[1].walk_f).toBeGreaterThanOrEqual(2);
    expect(report.pip[2].carry_f).toBeGreaterThanOrEqual(2);
    expect(report.juno[1].carry_b).toBeGreaterThanOrEqual(2);
    expect(report.ollie[2].walk_f).toBeGreaterThanOrEqual(2);
  });
  it('every loop keeps one canvas size across its frames', () => {
    const size = new Map<string, string>(SPRITES.map((s) => [s.key as string, `${s.w}x${s.h}`]));
    const bases = new Set([...real].filter((k) => /^crewl_/.test(k)).map((k) => k.replace(/_\d+$/, '')));
    for (const b of bases) {
      const sizes = new Set<string>();
      for (let i = 1; i <= 5; i++) if (size.has(`${b}_${i}`)) sizes.add(size.get(`${b}_${i}`)!);
      expect(sizes.size, b).toBe(1);
    }
  });
  it('has the prop sequences in order', () => {
    expect(oopsSequence(hasReal, 'oops_prop_puddle_oat').length).toBe(5);
    expect(oopsSequence(hasReal, 'oops_prop_crumbs').length).toBe(4);
  });
});
