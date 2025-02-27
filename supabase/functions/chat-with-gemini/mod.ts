
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "./utils/cors.ts"
import { initSupabase } from "./db.ts"
import { determineQueryType } from "./classification.ts"
import { handleCarSpecificQuestion } from "./handlers/automotive.ts"
import { handleSafetyProtocol } from "./handlers/safety.ts"
import { handleBookingQuery } from "./handlers/booking.ts"
import { handleClientManagement } from "./handlers/client.ts"
import { handleVehicleLookup } from "./handlers/vehicle.ts"
import { handleJobSheetQuery } from "./handlers/jobSheet.ts"
import { updateChatMemory } from "./chatMemory.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    const supabase = initSupabase();

    // Determine the type of query
    const queryType = await determineQueryType(message);
    
    // Route to appropriate handler based on query type
    let response;
    switch (queryType) {
      case 'automotive':
        response = await handleCarSpecificQuestion(message);
        break;
      case 'safety':
        response = await handleSafetyProtocol(message);
        break;
      case 'booking':
        response = await handleBookingQuery(message, user_id, supabase);
        break;
      case 'client':
        response = await handleClientManagement(message, supabase);
        break;
      case 'vehicle':
        response = await handleVehicleLookup(message, supabase);
        break;
      case 'jobSheet':
        response = await handleJobSheetQuery(message, supabase);
        break;
      default:
        response = "I'm not sure how to help with that. Could you please rephrase your question?";
    }

    // Update chat memory if needed
    await updateChatMemory(user_id, message, response);

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
