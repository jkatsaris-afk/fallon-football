import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qfgxbzqhwpscjpflxqfs.supabase.co";
const supabaseKey = "YOUR_PUBLIC_KEY";

export const supabase = createClient(supabaseUrl, supabaseKey);
