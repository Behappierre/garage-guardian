import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatQueryResults = (data: any[], queryType: string) => {
  console.log('Formatting results for type:', queryType, 'Data:', data);
  
  if (!data || data.length === 0) {
    return "No appointments scheduled at this time.";
  }

  switch (queryType) {
    case 'appointments':
      return data.map(appointment => `
📅 Appointment Details:
------------------------
🕒 Time: ${formatDateTime(appointment.start_time)}
📝 Service: ${appointment.service_type || 'Not specified'}
📋 Status: ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
${appointment.notes ? `📌 Notes: ${appointment.notes}` : ''}
`).join('\n');

    case 'job_tickets':
      return data.map(ticket => `
🔧 Job Ticket: ${ticket.ticket_number}
------------------------
📝 Description: ${ticket.description.split('\n')[0]}... 
🏷️ Status: ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
⚡ Priority: ${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
📅 Created: ${formatDateTime(ticket.created_at)}
`).join('\n');

    case 'vehicles':
      return data.map(vehicle => `
🚗 Vehicle Details:
------------------------
Make: ${vehicle.make}
Model: ${vehicle.model}
Year: ${vehicle.year}
${vehicle.license_plate ? `License: ${vehicle.license_plate}` : ''}
${vehicle.vin ? `VIN: ${vehicle.vin}` : ''}
`).join('\n');

    default:
      console.log('Unknown query type:', queryType);
      return "```json\n" + JSON.stringify(data, null, 2) + "\n```";
  }
};

const systemPrompt = `You are GarageWizz AI Assistant, an expert in auto repair shop management. Help users retrieve information about appointments, clients, vehicles, and job tickets. For appointments, only use this exact query:

SELECT * FROM appointments ORDER BY start_time DESC LIMIT 5;
[QueryType: appointments]

User Question: `;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!geminiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      throw new Error('Configuration error');
    }

    const { message } = await req.json();
    if (!message) {
      throw new Error('No message provided');
    }

    console.log('Processing request:', message);

    // For appointments query, skip AI and directly execute the query
    if (message.toLowerCase().includes('appointment')) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const query = "SELECT * FROM appointments ORDER BY start_time DESC LIMIT 5";
      
      console.log('Executing appointments query');
      
      const { data: queryResult, error: dbError } = await supabase.rpc('execute_read_only_query', {
        query_text: query
      });

      console.log('Query result:', queryResult);
      console.log('Query error:', dbError);

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      const formattedResults = formatQueryResults(queryResult, 'appointments');
      console.log('Formatted results:', formattedResults);
      
      return new Response(
        JSON.stringify({ 
          response: "Let me check the upcoming appointments for you:\n\n" + formattedResults 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other queries, use Gemini
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemPrompt + message }]
        }]
      })
    });

    if (!aiResponse.ok) {
      console.error('Gemini API error:', await aiResponse.text());
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);

    // For non-appointment queries, return AI response directly
    return new Response(
      JSON.stringify({ 
        response: aiData.candidates[0].content.parts[0].text 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
