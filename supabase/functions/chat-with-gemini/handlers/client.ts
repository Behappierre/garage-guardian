
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

export async function handleClientRequest(message: string, supabaseClient: any) {
  console.log('Processing client request:', message);
  
  return "I'll help you with client-related information. What would you like to know?";
}
