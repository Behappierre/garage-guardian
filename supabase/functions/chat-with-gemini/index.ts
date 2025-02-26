
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
      throw new Error('Missing Gemini API key');
    }

    // First, get AI response to understand user's intent
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ 
              text: `You are a friendly auto repair shop assistant. Help the user with their question: ${message}
              
If they ask about appointments or schedule, respond with QUERY_APPOINTMENTS.
If they ask about maintenance or repairs, provide helpful advice.
For general questions, provide a friendly and informative response.
              
Remember to be friendly and helpful in your responses.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      console.error('Gemini API error:', await aiResponse.text());
      throw new Error('Failed to get AI response');
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);

    if (!aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid AI response format');
    }

    const aiText = aiData.candidates[0].content.parts[0].text;
    console.log('AI text:', aiText);

    // If AI indicates we should query appointments
    if (aiText.includes('QUERY_APPOINTMENTS')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase configuration');
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (
            first_name,
            last_name
          ),
          vehicles (
            make,
            model,
            year
          )
        `)
        .order('start_time', { ascending: true })
        .gte('start_time', new Date().toISOString())
        .limit(5);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Get another AI response to format the appointments data
      const formatResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ 
                text: `Given these appointments: ${JSON.stringify(appointments, null, 2)}
                
Format them into a friendly, easy to read response. Use emojis and proper formatting.
If there are no appointments, let the user know in a friendly way.
                
Be concise but friendly in your response.`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      const formatData = await formatResponse.json();
      const formattedResponse = formatData.candidates[0].content.parts[0].text;

      return new Response(
        JSON.stringify({ response: formattedResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-appointment queries, return the AI response directly
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
