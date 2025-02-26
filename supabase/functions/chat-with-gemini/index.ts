
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

const systemPrompt = `You are GarageWizz AI Assistant, an expert in auto repair shop management. You have access to the database and can help users retrieve information.

To get data, you can use these READ-ONLY SQL queries (do not attempt modifications):

1. List recent appointments:
   SELECT * FROM appointments ORDER BY start_time DESC LIMIT 5;
   [QueryType: appointments]

2. Find client information:
   SELECT * FROM clients WHERE first_name ILIKE '%{search}%' OR last_name ILIKE '%{search}%' LIMIT 5;
   [QueryType: clients]

3. Check vehicle history:
   SELECT v.*, c.first_name, c.last_name 
   FROM vehicles v 
   JOIN clients c ON v.client_id = c.id 
   WHERE v.make ILIKE '%{search}%' OR v.model ILIKE '%{search}%' 
   LIMIT 5;
   [QueryType: vehicles]

4. View job tickets:
   SELECT jt.*, c.first_name, c.last_name 
   FROM job_tickets jt 
   JOIN clients c ON jt.client_id = c.id 
   WHERE status = '{status}' 
   ORDER BY created_at DESC 
   LIMIT 5;
   [QueryType: job_tickets]

When executing a query, specify the QueryType in square brackets after the query to ensure proper formatting.

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
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { message } = await req.json();
    if (!message) {
      throw new Error('No message provided');
    }

    console.log('Processing request:', message);

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

    if (!aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid AI response format');
    }

    let response = aiData.candidates[0].content.parts[0].text;
    console.log('Raw AI response text:', response);

    // Extract query and type
    const sqlMatch = response.match(/```sql\n([\s\S]*?)\n```.*?\[QueryType:\s*(\w+)\]/);
    if (sqlMatch) {
      const [_, sqlQuery, queryType] = sqlMatch;
      console.log('Executing SQL query:', sqlQuery);
      console.log('Query type:', queryType);

      try {
        // Execute the actual query from the AI response
        const { data: queryResult, error: dbError } = await supabase.rpc('execute_read_only_query', {
          query_text: sqlQuery
        });

        console.log('Query result:', queryResult);
        console.log('Query error:', dbError);

        if (dbError) throw dbError;

        const formattedResults = formatQueryResults(queryResult, queryType);
        console.log('Formatted results:', formattedResults);
        
        // Replace the SQL query in the response with the formatted results
        response = "Let me check the upcoming appointments for you:\n\n" + formattedResults;
      } catch (dbError) {
        console.error('Database query error:', dbError);
        response = "I apologize, but I encountered an error while retrieving the appointments. Please try again in a moment.";
      }
    } else {
      console.log('No SQL query found in response');
    }

    return new Response(
      JSON.stringify({ response }),
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
