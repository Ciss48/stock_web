import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side only — SUPABASE_SERVICE_ROLE_KEY must NOT be NEXT_PUBLIC_
// Lazy singleton: defer creation until first call so build-time module
// evaluation doesn't fail when env vars aren't available yet.
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}
