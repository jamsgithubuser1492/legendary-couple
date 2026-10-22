// Pure helpers for the notify function. No Deno or Node globals, so the unit tests can import this file directly.

export const KINDS = ['approve', 'daily', 'whisper', 'box', 'surprise', 'weekly', 'event', 'multi', 'test'] as const;
export type Kind = (typeof KINDS)[number];
export type Player = 'A' | 'B';

export const MIN_GAP_MS = 10 * 60 * 1000; // the same kind never reaches the same phone twice within ten minutes
export const TEXT_MAX = 140;
export const DEFAULT_QUIET = { start: 22 * 60, end: 8 * 60 }; // 22:00 to 08:00, minutes after midnight

export interface NotifyBody { room: string; from: Player; to: Player; kind: Kind; text: string; url: string }

const isPlayer = (v: unknown): v is Player => v === 'A' || v === 'B';

/** Checks what the phone sent. Returns the clean body or the reason it was refused. */
export function validate(raw: unknown): { ok: true; body: NotifyBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'bad body' };
  const b = raw as Record<string, unknown>;
  const room = typeof b.room === 'string' ? b.room.trim().toUpperCase() : '';
  if (room.length < 4 || room.length > 12 || !/^[A-Z0-9]+$/.test(room)) return { ok: false, error: 'bad room' };
  if (!isPlayer(b.from) || !isPlayer(b.to)) return { ok: false, error: 'bad player' };
  const kind = b.kind;
  if (typeof kind !== 'string' || !(KINDS as readonly string[]).includes(kind)) return { ok: false, error: 'bad kind' };
  if (kind !== 'test' && b.from === b.to) return { ok: false, error: 'same player' };
  const text = typeof b.text === 'string' ? b.text.replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) : '';
  if (!text) return { ok: false, error: 'no text' };
  const url = typeof b.url === 'string' && b.url.length < 300 && !/^\s*(javascript|data):/i.test(b.url) ? b.url : './';
  return { ok: true, body: { room, from: b.from, to: b.to, kind: kind as Kind, text, url } };
}

/**
 * Is it quiet time on the recipient's phone? tzOffsetMin is what the browser reports (minutes behind UTC, so a phone
 * in California in winter reports 480). start and end are minutes after midnight in their own clock; the window may
 * cross midnight. Equal values mean no quiet hours.
 */
export function inQuietHours(nowMs: number, tzOffsetMin: number, start: number, end: number): boolean {
  if (start === end) return false;
  const local = (((Math.floor(nowMs / 60000) - tzOffsetMin) % 1440) + 1440) % 1440;
  return start < end ? local >= start && local < end : local >= start || local < end;
}

/** True when this kind reached this subscription too recently. */
export function rateLimited(lastSentAt: string | number | null | undefined, nowMs: number, gapMs = MIN_GAP_MS): boolean {
  if (lastSentAt == null) return false;
  const t = typeof lastSentAt === 'number' ? lastSentAt : Date.parse(lastSentAt);
  return Number.isFinite(t) && nowMs - t < gapMs;
}

/** The notification the service worker shows. A tag per kind means a repeat replaces the old one. */
export function buildPayload(b: Pick<NotifyBody, 'kind' | 'text' | 'url'>): { title: string; body: string; tag: string; url: string } {
  return { title: b.kind === 'test' ? 'Reminders are on' : 'Our Little World', body: b.text, tag: `olw-${b.kind}`, url: b.url };
}

/** Whether a web push error means the phone has unsubscribed for good. */
export const isGone = (status: number | undefined) => status === 404 || status === 410;
