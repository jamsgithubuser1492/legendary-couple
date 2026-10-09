import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Placeholder client for Build 2 (real-time sync). Returns null until env vars are set,
// so the game keeps working offline with localStorage.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey || url.includes('YOUR-PROJECT')) return null;
  if (!client) client = createClient(url, anonKey);
  return client;
}

// Build 2 will subscribe here, e.g.:
// getSupabase()?.channel(`room:${code}`).on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, cb).subscribe();
