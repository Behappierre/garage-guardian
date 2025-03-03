
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the Auth context of the function
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const requestData = await req.json();
    
    // Extract job ticket data from the request
    const {
      description,
      status,
      priority,
      assigned_technician_id,
      client_id,
      vehicle_id,
      garage_id
    } = requestData;

    // Call the RPC function to create the job ticket
    const { data, error } = await supabase.rpc('create_job_ticket', {
      p_description: description,
      p_status: status,
      p_priority: priority,
      p_assigned_technician_id: assigned_technician_id,
      p_client_id: client_id,
      p_vehicle_id: vehicle_id,
      p_garage_id: garage_id
    });

    if (error) {
      console.error('Error creating job ticket:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return the job ticket ID
    return new Response(
      JSON.stringify({ jobTicketId: data }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
