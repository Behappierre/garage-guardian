
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getCurrentStatistics(supabase: any) {
  try {
    const [clients, tickets, appointments] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact' }),
      supabase.from('job_tickets').select('*', { count: 'exact' }),
      supabase.from('appointments').select('*', { count: 'exact' })
    ]);

    return {
      totalClients: clients.count,
      totalTickets: tickets.count,
      totalAppointments: appointments.count
    };
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return null;
  }
}

async function getBookingsForDate(supabase: any, date: Date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error, count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());

    if (error) throw error;
    return { count, appointments: data };
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return null;
  }
}

async function handleGeneralQuery(message: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found');
    return null;
  }

  try {
    console.log('Calling Gemini API with message:', message);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: message
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      console.error(`Gemini API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('Gemini API response:', data);
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini API response structure:', data);
      return null;
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for bookings queries
    if (message.toLowerCase().includes('bookings') || message.toLowerCase().includes('appointments')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (message.toLowerCase().includes('tomorrow')) {
        const bookings = await getBookingsForDate(supabaseClient, tomorrow);
        if (bookings) {
          return new Response(
            JSON.stringify({
              response: `There ${bookings.count === 1 ? 'is' : 'are'} ${bookings.count} booking${bookings.count === 1 ? '' : 's'} scheduled for tomorrow.`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Check for statistics queries
    if (message.toLowerCase().includes('statistics') || 
        message.toLowerCase().includes('stats') || 
        message.toLowerCase().includes('count')) {
      const stats = await getCurrentStatistics(supabaseClient);
      if (stats) {
        const response = `**Current Statistics:**\n\n` +
          `• Total Clients: ${stats.totalClients}\n` +
          `• Total Job Tickets: ${stats.totalTickets}\n` +
          `• Total Appointments: ${stats.totalAppointments}`;
        
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // For all other queries, use Gemini
    console.log('Attempting to handle with Gemini');
    const generatedResponse = await handleGeneralQuery(message);
    if (generatedResponse) {
      return new Response(
        JSON.stringify({ response: generatedResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only reach here if both specific handlers and Gemini failed
    return new Response(
      JSON.stringify({ response: "I'm sorry, I didn't understand your request. Please try again." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in edge function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "I apologize, but I'm having trouble processing your request at the moment. Please try again later."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
