
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { determineQueryType } from './classification.ts';
import { handleBookingRequest } from './handlers/booking.ts';
import { handleClientRequest } from './handlers/client.ts';
import { handleVehicleRequest } from './handlers/vehicle.ts';
import { handleSafetyRequest } from './handlers/safety.ts';
import { handleJobSheetRequest } from './handlers/jobSheet.ts';
import { handleAutomotiveRequest } from './handlers/automotive.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    console.log('Received message:', message);
    console.log('User ID:', user_id);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get user's garage_id
    let garageId = null;
    if (user_id) {
      const { data: userData, error: userError } = await supabaseClient
        .from('profiles')
        .select('garage_id')
        .eq('id', user_id)
        .single();
        
      if (userError) {
        console.error("Error fetching user's garage_id:", userError);
      } else {
        garageId = userData?.garage_id;
        console.log('User garage ID for chat-with-gemini:', garageId);
      }
    }

    // Determine the type of query
    const queryType = await determineQueryType(message);
    console.log('Determined query type:', queryType);

    // Handle the query based on its type
    let response;
    switch (queryType) {
      case 'booking':
        response = await handleBookingRequest(message, supabaseClient, user_id);
        break;
      case 'client':
        response = await handleClientRequest(message, supabaseClient, garageId);
        break;
      case 'vehicle':
        response = await handleVehicleRequest(message, supabaseClient, garageId);
        break;
      case 'safety':
        response = await handleSafetyRequest(message);
        break;
      case 'jobSheet':
        response = await handleJobSheetRequest(message, supabaseClient, garageId);
        break;
      default:
        response = await handleAutomotiveRequest(message);
    }

    // If no specific handler returned a response, use a default message
    if (!response) {
      response = "I apologize, but I'm not sure how to help with that specific request. Could you please rephrase or provide more details?";
    }

    // Store the conversation in the database
    const { error: chatError } = await supabaseClient
      .from('chat_messages')
      .insert({
        user_id,
        message,
        response,
        metadata: { query_type: queryType, garage_id: garageId }
      });

    if (chatError) {
      console.error('Error storing chat message:', chatError);
    }

    return new Response(
      JSON.stringify({ response }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request.' 
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
