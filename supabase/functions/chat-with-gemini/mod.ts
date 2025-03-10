
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
import { updateChatMemory, getConversationContext, getConversationState } from "./chatMemory.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    console.log("Received message:", message);
    console.log("User ID:", user_id);
    
    const supabase = initSupabase();
    
    // Get previous conversation context and state to provide more continuity
    const conversationContext = await getConversationContext(user_id, supabase);
    const conversationState = await getConversationState(user_id, supabase);
    
    console.log('Previous conversation context:', conversationContext);
    console.log('Current conversation state:', conversationState);

    // If there's an active conversation state, prefer the intent from that flow
    let intent: string = '';
    let confidence: number = 0;
    let entities: Record<string, string> | undefined;
    
    if (conversationState && conversationState.stage === 'appointment_modification_confirmation') {
      intent = 'appointment_modification';
      confidence = 1.0; // High confidence since we're continuing a flow
      console.log('Using intent from active conversation state:', intent);
    } else {
      // Get classification result with intent and extracted entities
      const classification = determineQueryIntent(message);
      intent = classification.intent;
      confidence = classification.confidence;
      entities = classification.entities;
      console.log('Message classification:', classification);
    }
    
    // Route to appropriate handler based on query type
    let response;
    switch (intent) {
      case 'automotive':
        response = await handleCarSpecificQuestion(message);
        break;
      case 'safety':
        response = await handleSafetyProtocol(message);
        break;
      case 'booking':
        response = await handleBookingQuery(message, user_id, supabase, entities);
        break;
      case 'appointment_modification':
        // Handle appointment modifications through the booking handler
        // The booking handler has been updated to detect and process modification requests
        response = await handleBookingQuery(message, user_id, supabase, entities);
        break;
      case 'client':
        response = await handleClientManagement(message, supabase, entities);
        break;
      case 'vehicle':
        response = await handleVehicleLookup(message, supabase, entities);
        break;
      case 'jobSheet':
        response = await handleJobSheetQuery(message, supabase, entities);
        break;
      default:
        response = "I'm not sure how to help with that. Could you please rephrase your question?";
    }

    // Update chat memory with new interaction data
    await updateChatMemory(
      user_id, 
      message, 
      response, 
      intent, 
      entities, 
      supabase
    );

    return new Response(JSON.stringify({ 
      response,
      metadata: {
        query_type: intent,
        confidence: confidence,
        entities: entities,
        context: conversationContext,
        state: conversationState ? conversationState.stage : null
      }
    }), {
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
