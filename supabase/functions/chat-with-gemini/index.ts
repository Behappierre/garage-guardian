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

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      console.error('Missing Gemini API key');
      throw new Error('Configuration error');
    }

    // Generate content using Gemini API
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
Otherwise, provide a helpful response about auto repair, maintenance, or general information.` }
              ]
            }
          ]
        })
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response data:', aiData);

    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      console.error('Invalid AI response format:', aiData);
      throw new Error('Invalid response from AI');
    }

    console.log('Processed AI text:', aiText);

    // Initialize Supabase client if we need it
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle job tickets query
    if (aiText.includes('QUERY_JOB_TICKETS')) {
      const { data: tickets, error } = await supabase
        .from('job_tickets')
        .select('status')
        .eq('status', 'in_progress');

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ 
          response: `Okay, I've checked. We currently have ${tickets.length} ticket${tickets.length === 1 ? '' : 's'} in progress.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle appointment queries (keeping existing code)
    if (aiText.includes('QUERY_APPOINTMENTS')) {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*, clients ( first_name, last_name ), vehicles ( make, model, year )')
        .order('start_time', { ascending: true })
        .gte('start_time', new Date().toISOString())
        .limit(5);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      const formatResponse = await fetch(
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
                  { text: `Format these appointments into a friendly response: ${JSON.stringify(appointments, null, 2)}
                    
Use emojis and clear formatting. If there are no appointments, just say so in a friendly way.
Be concise and clear.` }
                ]
              }
            ]
          })
        }
      );

      const formatData = await formatResponse.json();
      const formattedResponse = formatData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!formattedResponse) {
        throw new Error('Failed to format appointments response');
      }

      return new Response(
        JSON.stringify({ response: formattedResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-database queries, return the AI response directly
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
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
