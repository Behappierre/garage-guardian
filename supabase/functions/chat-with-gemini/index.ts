
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

    // Check for "list vehicles" queries
    const listVehiclesMatch = message.toLowerCase().match(/list ([a-zA-Z ]+)'s vehicles/);
    if (listVehiclesMatch) {
      const clientName = listVehiclesMatch[1].trim();
      const nameParts = clientName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      console.log(`Looking up vehicles for ${firstName} ${lastName}`);

      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          clients!inner (
            first_name,
            last_name
          )
        `)
        .ilike('clients.first_name', firstName)
        .ilike('clients.last_name', lastName);

      if (error) {
        console.error('Vehicle lookup error:', error);
        return new Response(
          JSON.stringify({ 
            response: `I couldn't find any vehicles for ${clientName}.` 
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
            response: `${clientName}'s vehicles:\n${vehicleList}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: `${clientName} has no vehicles registered in our system.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for client info queries
    const clientInfoMatch = message.toLowerCase().match(/about ([a-zA-Z ]+)/);
    if (clientInfoMatch) {
      const clientName = clientInfoMatch[1].trim();
      const nameParts = clientName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      console.log(`Looking up info for ${firstName} ${lastName}`);

      const { data: client, error } = await supabase
        .from('clients')
        .select(`
          *,
          vehicles (
            id,
            make,
            model,
            year,
            license_plate
          ),
          appointments (
            id,
            start_time,
            service_type,
            status,
            bay
          ),
          job_tickets (
            id,
            ticket_number,
            status,
            description
          )
        `)
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .single();

      if (error || !client) {
        return new Response(
          JSON.stringify({ response: `I couldn't find any information for ${clientName}.` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const vehicles = client.vehicles.map(v => 
        `${v.year} ${v.make} ${v.model}${v.license_plate ? ` (${v.license_plate})` : ''}`
      ).join(', ');

      const response = `
Client Information for ${client.first_name} ${client.last_name}:
Contact: ${client.phone || 'No phone'} | ${client.email || 'No email'}
Address: ${client.address || 'No address on file'}
Vehicles: ${vehicles || 'No vehicles registered'}
      `.trim();

      return new Response(
        JSON.stringify({ response }),
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
