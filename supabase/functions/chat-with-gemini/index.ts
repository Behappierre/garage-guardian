
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are GarageWizz AI Assistant, an expert in auto repair shop management. You have access to the database and can help users retrieve information.

To get data, you can use these READ-ONLY SQL queries (do not attempt modifications):

1. List recent appointments:
   SELECT * FROM appointments ORDER BY start_time DESC LIMIT 5;

2. Find client information:
   SELECT * FROM clients WHERE first_name ILIKE '%{search}%' OR last_name ILIKE '%{search}%' LIMIT 5;

3. Check vehicle history:
   SELECT v.*, c.first_name, c.last_name 
   FROM vehicles v 
   JOIN clients c ON v.client_id = c.id 
   WHERE v.make ILIKE '%{search}%' OR v.model ILIKE '%{search}%' 
   LIMIT 5;

4. View job tickets:
   SELECT jt.*, c.first_name, c.last_name 
   FROM job_tickets jt 
   JOIN clients c ON jt.client_id = c.id 
   WHERE status = '{status}' 
   ORDER BY created_at DESC 
   LIMIT 5;

5. Check service history:
   SELECT sh.*, v.make, v.model 
   FROM service_history sh 
   JOIN vehicles v ON sh.vehicle_id = v.id 
   ORDER BY service_date DESC 
   LIMIT 5;

If a user asks for data, determine which query to use and execute it with appropriate parameters. Format the results in a clear, readable way.

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

    // First, get AI to understand the request
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

    // Check if the response contains an SQL query (enclosed in backticks)
    const sqlMatch = response.match(/```sql\n([\s\S]*?)\n```/);
    if (sqlMatch) {
      const sqlQuery = sqlMatch[1].trim();
      console.log('Executing SQL query:', sqlQuery);

      try {
        const { data: queryResult, error: dbError } = await supabase
          .from('job_tickets')
          .select('*')
          .limit(1);

        if (dbError) throw dbError;

        // Append the query results to the AI response
        response += "\n\nQuery Results:\n" + JSON.stringify(queryResult, null, 2);
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
