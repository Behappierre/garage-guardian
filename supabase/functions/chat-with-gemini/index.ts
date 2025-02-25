
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
  if (!data || data.length === 0) {
    return "No results found.";
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

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemPrompt + message }]
        }]
      })
    });

    const aiData = await aiResponse.json();
    let response = aiData.candidates[0].content.parts[0].text;

    // Extract query and type
    const sqlMatch = response.match(/```sql\n([\s\S]*?)\n```.*?\[QueryType:\s*(\w+)\]/);
    if (sqlMatch) {
      const [_, sqlQuery, queryType] = sqlMatch;
      console.log('Executing SQL query:', sqlQuery, 'Type:', queryType);

      try {
        const { data: queryResult, error: dbError } = await supabase
          .from('appointments')
          .select('*')
          .order('start_time', { ascending: false })
          .limit(5);

        if (dbError) throw dbError;

        const formattedResults = formatQueryResults(queryResult, queryType);
        response = response.replace(/```sql[\s\S]*?```.*?\[QueryType:\s*\w+\]/, 
          "Here are the results:\n\n" + formattedResults);
      } catch (dbError) {
        console.error('Database query error:', dbError);
        response += "\n\nSorry, I encountered an error while querying the database.";
      }
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
