
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If asking about appointments, execute direct query
    if (message.toLowerCase().includes('appointment')) {
      console.log('Processing appointment query');
      
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

      console.log('Retrieved appointments:', appointments);

      if (!appointments || appointments.length === 0) {
        return new Response(
          JSON.stringify({
            response: "I don't see any upcoming appointments scheduled at the moment."
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const formattedResponse = appointments.map(apt => {
        const clientName = apt.clients ? 
          `${apt.clients.first_name} ${apt.clients.last_name}` : 
          'No client assigned';
        
        const vehicle = apt.vehicles ? 
          `${apt.vehicles.year} ${apt.vehicles.make} ${apt.vehicles.model}` : 
          'No vehicle specified';

        return `📅 *${formatDateTime(apt.start_time)}*
👤 Client: ${clientName}
🚗 Vehicle: ${vehicle}
🔧 Service: ${apt.service_type}
${apt.notes ? `📝 Notes: ${apt.notes}` : ''}
──────────────`;
      }).join('\n\n');

      return new Response(
        JSON.stringify({
          response: `Here are the upcoming appointments:\n\n${formattedResponse}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-appointment queries, use Gemini
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      throw new Error('Missing Gemini API key');
    }

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: message }]
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
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
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
        response: "I apologize, but I'm having trouble retrieving that information at the moment. Please try again." 
      }),
      { 
        status: 200, // Return 200 even for errors to handle them gracefully in the UI
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
