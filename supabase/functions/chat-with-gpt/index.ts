
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { OpenAI } from "https://esm.sh/openai@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { determineQueryIntent } from "./classification.ts";
import { handleAutomotiveQuestion } from "./handlers/automotive.ts";
import { handleBookingRequest, handleAppointmentQuery } from "./handlers/booking.ts";
import { handleJobSheetQuery } from "./handlers/jobSheet.ts";
import { corsHeaders } from "./utils/cors.ts";
import { updateChatMemory, getConversationContext, getConversationState } from "./chatMemory.ts";
import { createDataService } from "./data-service.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    console.log('Received message:', message);
    console.log('User ID:', user_id);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not set');
    }

    const supabase = createClient(supabaseUrl as string, supabaseKey as string);
    
    // Get the user's garage_id
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', user_id)
      .single();
      
    if (userError) {
      console.error("Error fetching user's garage_id:", userError);
      throw new Error("Unable to determine user's garage");
    }
    
    const userGarageId = userData?.garage_id;
    console.log('User garage ID:', userGarageId);
    
    // Initialize data service
    const dataService = createDataService(userGarageId);
    
    // Get conversation context and state for more accurate responses
    const conversationContext = await getConversationContext(user_id, supabase);
    const conversationState = await getConversationState(user_id, supabase);
    
    console.log('Conversation context:', conversationContext);
    console.log('Conversation state:', conversationState);
    
    // If there's an active conversation state, prefer the intent from that flow
    let intent = 'unknown';
    let confidence = 0;
    let entities: Record<string, string> | undefined;
    
    if (conversationState && conversationState.stage === 'appointment_modification_confirmation') {
      // We're in the middle of an appointment modification flow
      intent = 'appointment_modification';
      confidence = 1.0; // High confidence since we're continuing a flow
      console.log('Using intent from active conversation state:', intent);
    } else {
      // Use enhanced classification to determine intent and extract entities
      const classification = determineQueryIntent(message);
      intent = classification.intent;
      confidence = classification.confidence;
      entities = classification.entities;
      console.log('Message classification:', classification);
    }
    
    // Route to appropriate handler based on classification
    let response;
    
    switch (intent) {
      case 'booking':
        // Check if it's a query about appointments
        if (checkIfAppointmentQuery(message)) {
          console.log("Detected appointment query intent");
          response = await handleAppointmentQuery(message, supabase, userGarageId);
        } else {
          console.log("Detected booking intent");
          response = await handleBookingRequest(message, supabase, user_id, entities);
        }
        break;
        
      case 'appointment_modification':
        // Handle appointment modifications through the booking handler
        console.log("Detected appointment modification intent");
        response = await handleBookingRequest(message, supabase, user_id, entities);
        break;
        
      case 'jobSheet':
        console.log("Detected job sheet intent");
        response = await handleJobSheetQuery(message, supabase, userGarageId, entities);
        break;
      
      case 'automotive':
        console.log("Detected automotive question");
        response = await handleAutomotiveQuestion(message, openAIApiKey);
        break;
        
      default:
        console.log("Using default OpenAI response");
        // For other intents, use the general OpenAI API
        const openai = new OpenAI({
          apiKey: openAIApiKey,
        });

        // Create context for OpenAI including conversation history
        let context = `
          You are a helpful automotive service assistant for the garage management system.
          
          You can help with:
          1. Automotive questions and service inquiries
          2. Creating bookings for clients
          3. Providing information about upcoming appointments
          4. Modifying existing appointments
          
          ${conversationContext ? `Context from previous conversation: ${conversationContext}` : ''}
          
          For bookings, tell users you can create bookings directly.
          For appointment queries, tell users you can check the schedule.
          For appointment modifications, tell users you can move or reschedule appointments.
          
          IMPORTANT: NEVER say you don't have access to real-time data. You CAN access appointment data.
          If someone asks about appointments or bookings, you should ALWAYS try to provide real information.
        `;

        // Create a chat completion
        const openaiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: context },
            { role: "user", content: message }
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        response = openaiResponse.choices[0].message.content;
    }

    // Store the conversation with updated memory
    try {
      await updateChatMemory(
        user_id, 
        message, 
        response, 
        intent,
        entities,
        supabase
      );
    } catch (storeError) {
      console.error('Error storing conversation:', storeError);
      // Continue even if storing conversation fails
    }

    return new Response(
      JSON.stringify({ 
        response,
        metadata: {
          query_type: intent,
          confidence: confidence,
          entities: entities,
          context: conversationContext,
          state: conversationState ? conversationState.stage : null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request.',
        details: error.message
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

// Helper functions

// Check if a message is a query about appointments
function checkIfAppointmentQuery(message: string): boolean {
  // Check for querying patterns
  const queryPatterns = [
    /what\s+(?:are\s+the\s+)?(?:bookings|appointments)/i,
    /show\s+(?:me\s+)?(?:the\s+)?(?:bookings|appointments)/i,
    /list\s+(?:the\s+)?(?:bookings|appointments)/i,
    /(?:bookings|appointments)(?:\s+do\s+we\s+have)?(?:\s+for)?/i,
    /schedule(?:\s+for)?/i,
    /upcoming(?:\s+appointments)?/i,
    /have\s+(?:we|you)\s+got\s+any\s+appointment/i,
    /do\s+(?:we|you)\s+have\s+any\s+appointment/i,
    /are\s+there\s+any\s+appointment/i
  ];
  
  return queryPatterns.some(pattern => pattern.test(message));
}
