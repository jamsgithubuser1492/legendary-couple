import { describe, expect, it } from 'vitest';
import { themeForDate } from './season';
import { firefliesInSeason, fireflyFade, weatherRule } from './weather';

const days = (year: number) => {
  const out: Date[] = [];
  for (let m = 0; m < 12; m++) for (let d = 1; d <= new Date(year, m + 1, 0).getDate(); d++) out.push(new Date(year, m, d, 15, 0));
  return out;
};
const wx = (d: Date) => weatherRule(d, themeForDate(d));

describe('weather follows the real seasons', () => {
  it('snows only in winter and the holidays', () => {
    for (const y of [2025, 2026, 2027]) for (const d of days(y)) {
      if (wx(d) === 'snow') expect(['winter', 'holidays']).toContain(themeForDate(d));
    }
  });
  it('snows on about two days in three in the holidays', () => {
    let snow = 0, n = 0;
    for (const y of [2024, 2025, 2026, 2027]) for (const d of days(y)) {
      if (themeForDate(d) !== 'holidays') continue;
      n++;
      if (wx(d) === 'snow') snow++;
    }
    expect(snow / n).toBeGreaterThan(0.55);
    expect(snow / n).toBeLessThan(0.75);
  });
  it('rains about one day in three in spring and autumn, and rarely in winter', () => {
    const share = (t: string) => {
      let r = 0, n = 0;
      for (const y of [2024, 2025, 2026, 2027]) for (const d of days(y)) if (themeForDate(d) === t) { n++; if (wx(d) === 'rain') r++; }
      return r / n;
    };
    expect(share('spring')).toBeGreaterThan(0.2);
    expect(share('spring')).toBeLessThan(0.4);
    expect(share('autumn')).toBeGreaterThan(0.2);
    expect(share('winter')).toBeLessThan(0.1);
    expect(share('holidays')).toBe(0);
  });
  it('summer has only brief afternoon showers', () => {
    let rainy = 0, n = 0;
    for (const d of days(2026)) {
      if (themeForDate(d) !== 'summer') continue;
      n++;
      const morning = new Date(d); morning.setHours(9);
      expect(weatherRule(morning, 'summer')).toBe('clear');
      if (weatherRule(d, 'summer') === 'rain') rainy++;
    }
    expect(rainy / n).toBeLessThan(0.15);
  });
  it('gives the same answer for the same date, and a chosen weather wins over the season', () => {
    const d = new Date(2026, 6, 4, 15);
    expect(wx(d)).toBe(wx(new Date(2026, 6, 4, 15, 30)));
    expect(weatherRule(d, 'summer', 'snow')).toBe('snow');
    expect(weatherRule(d, 'summer', 'clear')).toBe('clear');
  });
});

describe('fireflies are real', () => {
  it('are out every summer evening and never in winter or autumn', () => {
    for (let day = 1; day <= 30; day++) expect(firefliesInSeason(new Date(2026, 5, day))).toBe(true);
    for (const m of [9, 10, 11, 0, 1, 2, 3]) for (let day = 1; day <= 28; day++) expect(firefliesInSeason(new Date(2026, m, day))).toBe(false);
  });
  it('appear on some evenings in late May and early September only', () => {
    let may = 0, sep = 0;
    for (let day = 25; day <= 31; day++) if (firefliesInSeason(new Date(2026, 4, day))) may++;
    for (let day = 1; day <= 7; day++) if (firefliesInSeason(new Date(2026, 8, day))) sep++;
    expect(may).toBeGreaterThan(0);
    expect(may).toBeLessThan(7);
    expect(sep).toBeGreaterThan(0);
    expect(sep).toBeLessThan(7);
    expect(firefliesInSeason(new Date(2026, 4, 10))).toBe(false);
    expect(firefliesInSeason(new Date(2026, 8, 20))).toBe(false);
  });
  it('fade in from 7 pm, shine from 9 pm to 4 am and are gone by 5 am', () => {
    expect(fireflyFade(12)).toBe(0);
    expect(fireflyFade(19)).toBe(0);
    expect(fireflyFade(20)).toBeCloseTo(0.5);
    expect(fireflyFade(22)).toBe(1);
    expect(fireflyFade(3)).toBe(1);
    expect(fireflyFade(4.5)).toBeCloseTo(0.5);
    expect(fireflyFade(5)).toBe(0);
    expect(fireflyFade(8)).toBe(0);
  });
});
