import { createClient } from "@supabase/supabase-js";

// Server-side only — SUPABASE_SERVICE_ROLE_KEY must NOT be NEXT_PUBLIC_
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
