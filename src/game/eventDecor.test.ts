import { describe, expect, it } from 'vitest';
import { freeTiles, inEntryZone, patchOf, planEventDecor } from './eventDecor';

const none = new Set<string>();

describe('event decor plan', () => {
  it('keeps the door clear', () => {
    const t = freeTiles(10, none);
    expect(t.some(inEntryZone)).toBe(false);
    expect(t.length).toBeGreaterThan(40);
  });
  it('finds a 2 by 2 patch against the left wall and skips blocked tiles', () => {
    expect(patchOf(2, 10, none, none)).toEqual({ x: 1, y: 3 });
    const blocked = new Set(['1,3', '1,4']);
    const p = patchOf(2, 10, blocked, none);
    expect(p && !(p.x === 1 && p.y <= 4 && p.y + 1 >= 3)).toBe(true);
  });
  it('plans the adoption pen, pets and basket, and blocks their tiles', () => {
    const plan = planEventDecor({ event: 'adopt', size: 10, blocked: none });
    expect(plan.props.map((p) => p.role)).toEqual(['pen', 'pets', 'basket']);
    expect(plan.blocked.length).toBe(5);
    expect(plan.bunting).toBe('ev_bunting_pink');
    expect(plan.sign).toEqual({ key: 'ev_sign_adopt', wall: 'left', at: 3 });
  });
  it('skips the pen when no patch is free and never double books a tile', () => {
    const all = new Set<string>();
    for (let x = 1; x < 10; x++) for (let y = 1; y < 10; y++) all.add(`${x},${y}`);
    expect(planEventDecor({ event: 'adopt', size: 10, blocked: all }).props.length).toBe(0);
    const plan = planEventDecor({ event: 'latte', size: 10, blocked: none });
    const tiles = plan.props.map((p) => `${p.tile.x},${p.tile.y}`);
    expect(new Set(tiles).size).toBe(tiles.length);
  });
  it('puts laptop clutter on up to three tables and the owl near the router', () => {
    const tables = [{ x: 5, y: 5, h: 12 }, { x: 6, y: 5, h: 12 }, { x: 7, y: 5, h: 12 }, { x: 8, y: 5, h: 12 }];
    const plan = planEventDecor({ event: 'study', size: 10, blocked: new Set(tables.map((t) => `${t.x},${t.y}`)), tables, routers: [{ x: 1, y: 6 }] });
    expect(plan.laptops.length).toBe(3);
    const owl = plan.props.find((p) => p.role === 'owl')!;
    expect(Math.abs(owl.tile.x - 2) + Math.abs(owl.tile.y - 6)).toBeLessThanOrEqual(1);
    expect(plan.lights).toBe('sk_lights_star');
  });
  it('jazz has warm lights, a record player and no bunting; a tiny room drops the wall sign', () => {
    const plan = planEventDecor({ event: 'jazz', size: 6, blocked: none });
    expect(plan.lights).toBe('ev_lights_warm');
    expect(plan.bunting).toBeNull();
    expect(plan.sign).toBeNull();
    expect(plan.props[0].role).toBe('record');
  });
});
