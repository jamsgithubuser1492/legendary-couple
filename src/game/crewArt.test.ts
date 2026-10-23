import { describe, expect, it } from 'vitest';
import { CREW } from '../state/crew';
import { SPRITES } from './spriteList';
import { levelOrder, loopLevel, loopReport, pickWorkScene, walkLoop, wobbleLoop, workScene, workScenes, oopsSequence } from './crewArt';

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

describe('work scenes and stations', () => {
  it('offers every station drawn, and never plays a scene from a level the crew member has not reached', () => {
    const has = fake([...frames('crewl_juno_2_work_shelf_fl', 4), ...frames('crewl_juno_2_work_play_fl', 4), ...frames('crewl_oren_3_work_fl', 4)]);
    expect(workScenes(has, def('juno'), 2).map((w) => w.station).sort()).toEqual(['play', 'shelf']);
    expect(workScenes(has, def('juno'), 3).map((w) => w.station).sort()).toEqual(['play', 'shelf']); // level 3 may use the level 2 scenes
    expect(workScenes(has, def('juno'), 1)).toEqual([]); // level 1 has no scene drawn and must not borrow a higher one
    expect(workScenes(has, def('oren'), 2)).toEqual([]); // the espresso loops are drawn in the Expert jacket
    // with an older one outfit loop available, a Level 1 Oren falls back to that, not to the Expert scene
    const withOld = fake([...frames('crewl_oren_3_work_fl', 4), ...frames('crewx_oren_work_fl', 2)]);
    expect(workScene(withOld, def('oren'), 1)?.frames).toEqual(frames('crewx_oren_work_fl', 2));
    expect(workScene(has, def('oren'), 3)?.frames).toEqual(frames('crewl_oren_3_work_fl', 4));
  });

  it('picks a true loop over a two picture alternation, and a random station when there are several', () => {
    const has = fake(['crewl_juno_2_work_fl_1', 'crewl_juno_2_work_fr_1', ...frames('crewl_juno_2_work_shelf_fl', 4), ...frames('crewl_juno_2_work_play_fl', 4)]);
    expect(pickWorkScene(has, def('juno'), 2, () => 0)?.station).toBe('shelf');
    expect(pickWorkScene(has, def('juno'), 2, () => 0.99)?.station).toBe('play');
    const only = fake(['crewl_juno_2_work_fl_1', 'crewl_juno_2_work_fr_1']);
    expect(pickWorkScene(only, def('juno'), 2)?.frames).toEqual(['crewl_juno_2_work_fl_1', 'crewl_juno_2_work_fr_1']);
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
    const bases = new Set([...real].filter((k) => /^crewl_.*_\d+$/.test(k)).map((k) => k.replace(/_\d+$/, ''))); // single poses have no frame number
    for (const b of bases) {
      const sizes = new Set<string>();
      for (let i = 1; i <= 5; i++) if (size.has(`${b}_${i}`)) sizes.add(size.get(`${b}_${i}`)!);
      expect(sizes.size, b).toBe(1);
    }
  });
  it('has the espresso loops for Oren at Expert and two stations for Juno at Skilled', () => {
    expect(report.oren[3].work_fl).toBe(4);
    expect(report.oren[3].work_fr).toBe(4);
    expect(report.juno[2].work_shelf_fl).toBe(4);
    expect(report.juno[2].work_play_fr).toBe(4);
    expect(workScenes(hasReal, def('juno'), 2).length).toBeGreaterThanOrEqual(2);
    expect(workScenes(hasReal, def('oren'), 3)[0].frames.length).toBe(4);
  });
  it('has the prop sequences in order', () => {
    expect(oopsSequence(hasReal, 'oops_prop_puddle_oat').length).toBe(5);
    expect(oopsSequence(hasReal, 'oops_prop_crumbs').length).toBe(4);
  });
});
