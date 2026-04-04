import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qfgxbzqhwpscjpflxqfs.supabase.co";

// ✅ MUST BE anon public key (long JWT)
const supabaseKey = "PASTE_ANON_PUBLIC_KEY_HERE";

export const supabase = createClient(supabaseUrl, supabaseKey);
