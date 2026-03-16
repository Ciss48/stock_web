import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ProxyAgent } from "undici";

// Server-side only — SUPABASE_SERVICE_ROLE_KEY must NOT be NEXT_PUBLIC_
// Lazy singleton: defer creation until first call so build-time module
// evaluation doesn't fail when env vars aren't available yet.
let _client: SupabaseClient | null = null;

// Build a proxy-aware fetch so Supabase HTTP calls go through FPT proxy.
// Next.js server-side fetch is backed by undici, which requires an undici
// ProxyAgent (not the http.Agent from https-proxy-agent).
function buildFetch(): typeof fetch {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return fetch;

  const dispatcher = new ProxyAgent(proxyUrl);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (input: any, init?: any) => fetch(input, { ...init, dispatcher });
}

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    _client = createClient(url, key, {
      auth: { persistSession: false },
      global: { fetch: buildFetch() },
    });
  }
  return _client;
}
