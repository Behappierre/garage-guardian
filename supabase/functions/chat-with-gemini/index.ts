
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { format } from "https://deno.land/std@0.182.0/datetime/mod.ts";

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

async function countTicketsWithParams(supabase: any, params: {
  status?: string;
  clientId?: string;
  vehicleId?: string;
  licensePlate?: string;
  bay?: string;
  technicianId?: string;
}) {
  let query = supabase
    .from('job_tickets')
    .select('*', { count: 'exact' });
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      switch (key) {
        case 'status':
          query = query.eq('status', value);
          break;
        case 'clientId':
          query = query.eq('client_id', value);
          break;
        case 'vehicleId':
          query = query.eq('vehicle_id', value);
          break;
        case 'licensePlate':
          query = query.eq('vehicles.license_plate', value);
          break;
        case 'bay':
          query = query.eq('bay', value);
          break;
        case 'technicianId':
          query = query.eq('assigned_technician_id', value);
          break;
      }
    }
  });

  const { count, error } = await query;
  
  if (error) {
    console.error('Error counting tickets:', error);
    return null;
  }
  
  return count;
}

async function handleGeneralQuery(message: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found');
    return null;
  }

  try {
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
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    return generatedText;
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

    // Check for status and statistics queries first
    const ticketStatusPattern = /(?:count |how many )?tickets?(?: in| with)? status ([a-z_]+)/i;
    const statusMatch = message.match(ticketStatusPattern);
    const isStatsQuery = message.toLowerCase().includes('statistics') || 
                        message.toLowerCase().includes('current stats') || 
                        message.toLowerCase().includes('show stats');
    
    if (statusMatch || isStatsQuery) {
      const stats = await getCurrentStatistics(supabaseClient);
      let response = `**Current Statistics:**\n\n`;
      response += `• Total Clients: ${stats?.totalClients}\n`;
      response += `• Total Job Tickets: ${stats?.totalTickets}\n`;
      response += `• Total Appointments: ${stats?.totalAppointments}`;
      
      if (statusMatch) {
        const status = statusMatch[1].toLowerCase();
        const count = await countTicketsWithParams(supabaseClient, { status });
        if (count !== null) {
          response += `\n\n**Requested Count:**\n`;
          response += `• Tickets in status "${status}": ${count}`;
        }
      }
      
      return new Response(
        JSON.stringify({ response }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For all other queries, use Gemini
    const generatedResponse = await handleGeneralQuery(message);
    if (generatedResponse) {
      return new Response(
        JSON.stringify({ response: generatedResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback response if no pattern matches and Gemini fails
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
