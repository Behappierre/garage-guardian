import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for bay-specific queries
    const bayMatch = message.toLowerCase().match(/what is in bay (\d+)/);
    if (bayMatch) {
      const bayNumber = bayMatch[1];
      const bay = `bay${bayNumber}`;

      console.log(`Looking up appointments in ${bay}`);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients (
            first_name,
            last_name
          ),
          vehicle:vehicles (
            make,
            model,
            year,
            license_plate
          )
        `)
        .eq('bay', bay)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Bay lookup error:', error);
        return new Response(
          JSON.stringify({ 
            response: `Sorry, I had trouble checking Bay ${bayNumber}.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (appointments && appointments.length > 0) {
        const appointment = appointments[0];
        const client = appointment.client;
        const vehicle = appointment.vehicle;
        
        let response = `Bay ${bayNumber} currently has `;
        
        if (vehicle) {
          response += `a ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          if (vehicle.license_plate) {
            response += ` (Plate: ${vehicle.license_plate})`;
          }
        }
        
        if (client) {
          response += ` for ${client.first_name} ${client.last_name}`;
        }
        
        response += `. Service type: ${appointment.service_type}`;
        
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: `Bay ${bayNumber} is currently empty.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for "list vehicles" queries
    const listVehiclesMatch = message.toLowerCase().match(/list ([a-zA-Z ]+)'s vehicles/);
    if (listVehiclesMatch) {
      const clientName = listVehiclesMatch[1].trim();
      const nameParts = clientName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      console.log(`Looking up vehicles for "${firstName}" "${lastName}"`);

      // First, let's check if the client exists
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .single();

      console.log('Client lookup result:', client || 'Not found');
      if (clientError) console.error('Client lookup error:', clientError);

      if (!client) {
        return new Response(
          JSON.stringify({ 
            response: `I couldn't find a client named ${clientName} in our system.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Now look up vehicles for this specific client
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('client_id', client.id);

      console.log('Vehicles found:', vehicles || 'None');
      if (vehicleError) console.error('Vehicle lookup error:', vehicleError);

      if (vehicleError) {
        return new Response(
          JSON.stringify({ 
            response: `Error looking up vehicles for ${clientName}.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (vehicles && vehicles.length > 0) {
        const vehicleList = vehicles.map(v => 
          `- ${v.year} ${v.make} ${v.model}${v.license_plate ? ` (Plate: ${v.license_plate})` : ''}`
        ).join('\n');
        
        return new Response(
          JSON.stringify({ 
            response: `${client.first_name} ${client.last_name}'s vehicles:\n${vehicleList}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: `${client.first_name} ${client.last_name} has no vehicles registered in our system.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate content using Gemini API for other queries
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      throw new Error('Missing Gemini API key');
    }

    const aiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `You are an auto repair shop assistant. Analyze this request and respond appropriately: ${message}

If the user is asking about appointments, respond with exactly: QUERY_APPOINTMENTS
If the user is asking about job tickets or their status, respond with exactly: QUERY_JOB_TICKETS
If the user is asking about clients in general, respond with exactly: QUERY_CLIENTS
Otherwise, provide a helpful response about auto repair, maintenance, or general information.` }
              ]
            }
          ]
        })
      }
    );

    if (!aiResponse.ok) {
      throw new Error('Failed to get AI response');
    }

    const aiData = await aiResponse.json();
    if (!aiData.candidates || !aiData.candidates[0] || !aiData.candidates[0].content) {
      throw new Error('Invalid AI response format');
    }

    const aiText = aiData.candidates[0].content.parts[0].text;
    console.log('Processed AI text:', aiText);

    return new Response(
      JSON.stringify({ response: aiText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        response: "I apologize, but I'm having trouble processing your request at the moment. Please try again." 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
