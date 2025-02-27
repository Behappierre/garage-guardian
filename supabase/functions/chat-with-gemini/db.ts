
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

export function initSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )
}
