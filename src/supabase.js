import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qfgxbzqhwpscjpflxqfs.supabase.co";
const supabaseKey = "sb_publishable_lfyWSkFOrrNDEqwM6OuVJw_2Yr4sYZK";

export const supabase = createClient(supabaseUrl, supabaseKey);
