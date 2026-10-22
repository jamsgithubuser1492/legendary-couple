// Supabase Edge Function: notify. Sends one web push to the other partner's phone(s).
// Paste this file and logic.ts into the dashboard (Edge Functions), or deploy with the CLI: supabase functions deploy notify
// Secrets to set: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (for example mailto:you@example.com).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';
import { DEFAULT_QUIET, buildPayload, inQuietHours, isGone, rateLimited, validate } from './logic.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'POST only' });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return reply(400, { ok: false, error: 'bad json' });
  }
  const v = validate(raw);
  if (!v.ok) return reply(400, { ok: false, error: v.error });
  const b = v.body;

  const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return reply(500, { ok: false, error: 'push keys are not set on the server' });
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@example.com', pub, priv);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: subs, error } = await db.from('push_subscriptions').select('*').eq('room_code', b.room).eq('player', b.to);
  if (error) return reply(500, { ok: false, error: 'lookup failed' });
  if (!subs?.length) return reply(200, { ok: true, sent: 0, reason: 'no subscribed phone' });

  const now = Date.now();
  const payload = JSON.stringify(buildPayload(b));
  let sent = 0, quiet = 0, limited = 0, removed = 0;
  for (const s of subs) {
    if (b.kind !== 'test') {
      if (inQuietHours(now, s.tz_offset_min ?? 0, s.quiet_start ?? DEFAULT_QUIET.start, s.quiet_end ?? DEFAULT_QUIET.end)) { quiet++; continue; }
      const last = (s.last_sent as Record<string, string> | null)?.[b.kind];
      if (rateLimited(last, now)) { limited++; continue; }
    }
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: 'low' });
      sent++;
      await db.from('push_subscriptions').update({ last_sent: { ...(s.last_sent ?? {}), [b.kind]: new Date(now).toISOString() } }).eq('endpoint', s.endpoint);
    } catch (e) {
      if (isGone((e as { statusCode?: number }).statusCode)) {
        removed++;
        await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }
  }
  return reply(200, { ok: true, sent, quiet, limited, removed });
});
