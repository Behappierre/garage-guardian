import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { determineQueryType } from './classification.ts'
import { handleBookingQuery } from './handlers/booking.ts'
import { handleAutomotiveQuery } from './handlers/automotive.ts'
import { handleVehicleQuery } from './handlers/vehicle.ts'
import { handleClientQuery } from './handlers/client.ts'
import { handleSafetyQuery } from './handlers/safety.ts'
import { handleJobSheetQuery } from './handlers/jobSheet.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Received request:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    const { message, user_id } = body;

    if (!message) {
      throw new Error('No message provided');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Supabase configuration:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine type of query
    const queryType = await determineQueryType(message);
    console.log('Query type determined:', queryType);

    // Handle query based on type
    let response;
    try {
      switch (queryType) {
        case 'booking':
          response = await handleBookingQuery(message, user_id, supabase);
          break;
        case 'automotive':
          response = await handleAutomotiveQuery(message);
          break;
        case 'vehicle':
          response = await handleVehicleQuery(message, supabase);
          break;
        case 'client':
          response = await handleClientQuery(message, supabase);
          break;
        case 'safety':
          response = await handleSafetyQuery(message);
          break;
        case 'job_sheet':
          response = await handleJobSheetQuery(message, supabase);
          break;
        default:
          response = "I'm not sure how to help with that specific query. Could you please rephrase?";
      }
    } catch (error) {
      console.error('Error in query handler:', error);
      throw error;
    }

    console.log('Sending response:', response);

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
        error: error instanceof Error ? error.message : 'An error occurred processing your request',
        details: error instanceof Error ? error.stack : undefined
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
