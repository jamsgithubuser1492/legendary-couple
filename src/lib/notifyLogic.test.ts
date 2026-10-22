import { describe, expect, it } from 'vitest';
import { buildPayload, inQuietHours, isGone, rateLimited, validate } from '../../supabase/functions/notify/logic';

const ok = { room: 'abcd12', from: 'A', to: 'B', kind: 'approve', text: 'Hello there', url: './' };

describe('validate', () => {
  it('accepts a good body and cleans the room', () => {
    const r = validate(ok);
    expect(r.ok && r.body.room).toBe('ABCD12');
  });
  it('refuses bad rooms, players, kinds and empty text', () => {
    expect(validate({ ...ok, room: 'ab' }).ok).toBe(false);
    expect(validate({ ...ok, room: 'x'.repeat(13) }).ok).toBe(false);
    expect(validate({ ...ok, room: 'ab cd!' }).ok).toBe(false);
    expect(validate({ ...ok, to: 'C' }).ok).toBe(false);
    expect(validate({ ...ok, kind: 'spam' }).ok).toBe(false);
    expect(validate({ ...ok, text: '   ' }).ok).toBe(false);
    expect(validate(null).ok).toBe(false);
    expect(validate('x').ok).toBe(false);
  });
  it('needs two different players except for a test', () => {
    expect(validate({ ...ok, to: 'A' }).ok).toBe(false);
    expect(validate({ ...ok, to: 'A', kind: 'test' }).ok).toBe(true);
  });
  it('caps the text and rejects script urls', () => {
    const r = validate({ ...ok, text: 'y'.repeat(500), url: 'javascript:alert(1)' });
    expect(r.ok && r.body.text.length).toBe(140);
    expect(r.ok && r.body.url).toBe('./');
  });
});

describe('inQuietHours', () => {
  const at = (h: number, m = 0) => Date.UTC(2026, 9, 21, h, m);
  it('handles a window that crosses midnight', () => {
    expect(inQuietHours(at(23), 0, 22 * 60, 8 * 60)).toBe(true);
    expect(inQuietHours(at(7, 59), 0, 22 * 60, 8 * 60)).toBe(true);
    expect(inQuietHours(at(8), 0, 22 * 60, 8 * 60)).toBe(false);
    expect(inQuietHours(at(15), 0, 22 * 60, 8 * 60)).toBe(false);
  });
  it('uses the recipient clock (California reports 420 in summer)', () => {
    expect(inQuietHours(at(6), 420, 22 * 60, 8 * 60)).toBe(true); // 23:00 local
    expect(inQuietHours(at(16), 420, 22 * 60, 8 * 60)).toBe(false); // 09:00 local
    expect(inQuietHours(at(3), -120, 22 * 60, 8 * 60)).toBe(true); // 05:00 local, east of UTC
    expect(inQuietHours(at(8), -120, 22 * 60, 8 * 60)).toBe(false); // 10:00 local
  });
  it('handles same day windows and equal values', () => {
    expect(inQuietHours(at(13), 0, 12 * 60, 14 * 60)).toBe(true);
    expect(inQuietHours(at(15), 0, 12 * 60, 14 * 60)).toBe(false);
    expect(inQuietHours(at(3), 0, 480, 480)).toBe(false);
  });
});

describe('rateLimited and payload', () => {
  const now = Date.UTC(2026, 9, 21, 12);
  it('limits repeats inside ten minutes only', () => {
    expect(rateLimited(null, now)).toBe(false);
    expect(rateLimited(new Date(now - 5 * 60000).toISOString(), now)).toBe(true);
    expect(rateLimited(new Date(now - 11 * 60000).toISOString(), now)).toBe(false);
    expect(rateLimited('not a date', now)).toBe(false);
  });
  it('builds a tagged payload and spots dead subscriptions', () => {
    expect(buildPayload({ kind: 'daily', text: 'hi', url: './' })).toEqual({ title: 'Our Little World', body: 'hi', tag: 'olw-daily', url: './' });
    expect(buildPayload({ kind: 'test', text: 'hi', url: './' }).title).toBe('Reminders are on');
    expect(isGone(410)).toBe(true);
    expect(isGone(404)).toBe(true);
    expect(isGone(500)).toBe(false);
  });
});
