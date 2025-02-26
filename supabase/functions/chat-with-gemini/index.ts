
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { format } from "https://deno.land/std@0.182.0/datetime/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Appointment {
  start_time: string;
  end_time: string;
  service_type: string;
  status: string;
  bay: string | null;
  client: {
    first_name: string;
    last_name: string;
  };
  vehicle?: {
    make: string;
    model: string;
    year: number;
    license_plate: string | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (isAppointmentQuery(message)) {
      console.log('Processing as appointment query');
      const appointments = await fetchRelevantAppointments(message, supabaseClient);
      if (appointments.length === 0) {
        return new Response(
          JSON.stringify({ 
            response: "I don't see any appointments matching your query."
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const formattedResponse = formatAppointmentsResponse(appointments, message);
      return new Response(
        JSON.stringify({ response: formattedResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-appointment queries, use the Gemini API
    console.log('Processing with Gemini API');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an auto service shop assistant. Answer the following question professionally and concisely: ${message}`
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

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    console.log('Gemini API response:', JSON.stringify(data, null, 2));

    // Check if we have a proper response with content
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "I apologize, but I'm having trouble processing your request at the moment. Please try again later."
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function isAppointmentQuery(message: string): boolean {
  const appointmentKeywords = [
    'appointment', 'appointments', 'booking', 'bookings', 'schedule',
    'scheduled', 'service', 'services', 'bay', 'bays', 'slot', 'slots'
  ];
  const timeKeywords = ['today', 'tomorrow', 'next week', 'this week'];
  
  const lowercaseMessage = message.toLowerCase();
  return appointmentKeywords.some(keyword => lowercaseMessage.includes(keyword)) ||
         timeKeywords.some(keyword => lowercaseMessage.includes(keyword));
}

async function fetchRelevantAppointments(message: string, supabase: any) {
  const lowercaseMessage = message.toLowerCase();
  let startDate = new Date();
  let endDate = new Date();

  if (lowercaseMessage.includes('tomorrow')) {
    startDate.setDate(startDate.getDate() + 1);
    endDate.setDate(endDate.getDate() + 1);
  } else if (lowercaseMessage.includes('next week')) {
    startDate.setDate(startDate.getDate() + 7);
    endDate.setDate(endDate.getDate() + 13);
  } else if (lowercaseMessage.includes('this week')) {
    // Adjust dates to cover the current week
    const today = startDate.getDay();
    endDate.setDate(endDate.getDate() + (6 - today));
  }

  // Set time to start and end of day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      client:clients(first_name, last_name),
      vehicle:vehicles(make, model, year, license_plate)
    `)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time');

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return appointments;
}

function formatAppointmentsResponse(appointments: Appointment[], originalQuery: string): string {
  let timeframe = "Today";
  if (originalQuery.toLowerCase().includes('tomorrow')) {
    timeframe = "Tomorrow";
  } else if (originalQuery.toLowerCase().includes('next week')) {
    timeframe = "Next week";
  } else if (originalQuery.toLowerCase().includes('this week')) {
    timeframe = "This week";
  }

  let response = `**Appointments for ${timeframe}:**\n\n`;

  appointments.forEach((apt, index) => {
    const startTime = new Date(apt.start_time);
    const endTime = new Date(apt.end_time);
    
    response += `**Appointment ${index + 1}**\n`;
    response += `**Time:** ${format(startTime, "h:mm a")} - ${format(endTime, "h:mm a")}\n`;
    response += `**Service:** ${apt.service_type}\n`;
    response += `**Client:** ${apt.client.first_name} ${apt.client.last_name}\n`;
    
    if (apt.vehicle) {
      response += `**Vehicle:** ${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`;
      if (apt.vehicle.license_plate) {
        response += ` (${apt.vehicle.license_plate})`;
      }
      response += '\n';
    }
    
    if (apt.bay) {
      response += `**Bay:** ${apt.bay}\n`;
    }
    
    response += `**Status:** ${apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}\n`;
    response += '\n';
  });

  return response;
}
