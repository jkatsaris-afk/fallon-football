import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qfgxbzqhwpscjpflxqfs.supabase.co'
const supabaseAnonKey = 'sb_publishable_lfyWSkFOrrNDEqwM6OuVJw_2Yr4sYZK'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
