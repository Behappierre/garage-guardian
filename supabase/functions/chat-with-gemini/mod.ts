
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "./utils/cors.ts"
import { initSupabase } from "./db.ts"
import { determineQueryType, determineQueryIntent, ClassificationResult } from "./classification.ts"
import { handleCarSpecificQuestion } from "./handlers/automotive.ts"
import { handleSafetyProtocol } from "./handlers/safety.ts"
import { handleBookingQuery } from "./handlers/booking.ts"
import { handleClientManagement } from "./handlers/client.ts"
import { handleVehicleLookup } from "./handlers/vehicle.ts"
import { handleJobSheetQuery } from "./handlers/jobSheet.ts"
import { updateChatMemory, getConversationContext } from "./chatMemory.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    const supabase = initSupabase();
    
    // Get previous conversation context to provide more continuity
    const conversationContext = await getConversationContext(user_id, supabase);
    console.log('Previous conversation context:', conversationContext);

    // Get classification result with intent and extracted entities
    const classification = determineQueryIntent(message);
    console.log('Message classification:', classification);
    
    // Route to appropriate handler based on query type
    let response;
    switch (classification.intent) {
      case 'automotive':
        response = await handleCarSpecificQuestion(message);
        break;
      case 'safety':
        response = await handleSafetyProtocol(message);
        break;
      case 'booking':
        response = await handleBookingQuery(message, user_id, supabase, classification.entities);
        break;
      case 'client':
        response = await handleClientManagement(message, supabase, classification.entities);
        break;
      case 'vehicle':
        response = await handleVehicleLookup(message, supabase, classification.entities);
        break;
      case 'jobSheet':
        response = await handleJobSheetQuery(message, supabase, classification.entities);
        break;
      default:
        response = "I'm not sure how to help with that. Could you please rephrase your question?";
    }

    // Update chat memory with new interaction data
    await updateChatMemory(
      user_id, 
      message, 
      response, 
      classification.intent, 
      classification.entities, 
      supabase
    );

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
