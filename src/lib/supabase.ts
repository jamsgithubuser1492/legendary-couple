import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Placeholder client for Build 2 (real-time sync). Returns null until env vars are set,
// so the game keeps working offline with localStorage.
// This project's address and publishable key. The publishable key is built to be public, so it is safe in the code.
// Environment variables still win if you ever point the game at a different project.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://fgsqsdbywzzyhttqprtk.supabase.co';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_5Ck2ry8nEukTIXiZgr4h2g_yS6npEfq';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey || url.includes('YOUR-PROJECT')) return null;
  if (!client) client = createClient(url, anonKey);
  return client;
}

// Build 2 will subscribe here, e.g.:
// getSupabase()?.channel(`room:${code}`).on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, cb).subscribe();
