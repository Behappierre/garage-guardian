
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

export async function handleVehicleRequest(message: string, supabaseClient: any) {
  console.log('Processing vehicle request:', message);
  
  return "I can help you with vehicle-related queries. What information do you need?";
}
