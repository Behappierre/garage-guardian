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

async function getBookingsForDate(supabase: any, date: Date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        client:clients(first_name, last_name),
        vehicle:vehicles(make, model, year, license_plate),
        job_tickets(*)
      `)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time');

    if (error) throw error;
    return appointments;
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return null;
  }
}

async function formatBookingDetails(bookings: any[]) {
  if (!bookings || bookings.length === 0) {
    return "There are no bookings scheduled for tomorrow.";
  }

  const formattedBookings = bookings.map(booking => {
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    const clientName = booking.client ? `${booking.client.first_name} ${booking.client.last_name}` : 'No client assigned';
    const vehicle = booking.vehicle ? 
      `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}${booking.vehicle.license_plate ? ` (${booking.vehicle.license_plate})` : ''}` : 
      'No vehicle specified';

    return `🕒 ${format(startTime, "h:mm a")} - ${format(endTime, "h:mm a")}\n` +
           `👤 Client: ${clientName}\n` +
           `🚗 Vehicle: ${vehicle}\n` +
           `🔧 Service: ${booking.service_type}\n` +
           `📍 Bay: ${booking.bay || 'Not assigned'}\n` +
           `${booking.notes ? `📝 Notes: ${booking.notes}\n` : ''}` +
           `Status: ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}`;
  });

  return `**Bookings for Tomorrow:**\n\n${formattedBookings.join('\n\n')}`;
}

async function handleGeneralQuery(message: string) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('OPENAI_API_KEY not found');
    return null;
  }

  try {
    console.log('Calling OpenAI API with message:', message);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an automotive service advisor AI assistant. You help with questions about 
            vehicles, maintenance, repairs, and general automotive knowledge. Keep responses concise 
            and format them using markdown for better readability. If you're not sure about something, 
            acknowledge that and provide any relevant information you are confident about.`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('OpenAI API response:', data);
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected OpenAI API response structure:', data);
      return null;
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

async function attemptBookingCreation(supabase: any, message: string) {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return null;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a booking assistant. Extract booking details from the user message into JSON format with these fields:
              - client_name (string, full name)
              - service_type (string)
              - requested_date (YYYY-MM-DD format)
              - requested_time (HH:mm format, 24h)
              - duration_minutes (number)
              - notes (string, optional)
              
              If any required field cannot be determined, set it to null.
              Response must be valid JSON.`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('Failed to parse booking intent');
      return null;
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) return null;

    let bookingDetails;
    try {
      bookingDetails = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', e);
      return null;
    }

    if (!bookingDetails.client_name || !bookingDetails.service_type || 
        !bookingDetails.requested_date || !bookingDetails.requested_time) {
      return {
        success: false,
        message: "I couldn't get all the required information. Please provide client name, service type, date, and time."
      };
    }

    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .or(`first_name.ilike.%${bookingDetails.client_name}%,last_name.ilike.%${bookingDetails.client_name}%`)
      .limit(1);

    if (!clients?.length) {
      return {
        success: false,
        message: `I couldn't find a client named "${bookingDetails.client_name}". Please check the name or create the client first.`
      };
    }

    const startTime = new Date(`${bookingDetails.requested_date}T${bookingDetails.requested_time}`);
    const endTime = new Date(startTime.getTime() + (bookingDetails.duration_minutes || 60) * 60000);

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        client_id: clients[0].id,
        service_type: bookingDetails.service_type,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: bookingDetails.notes,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create appointment:', error);
      return {
        success: false,
        message: "Sorry, I couldn't create the appointment due to a technical error."
      };
    }

    return {
      success: true,
      message: `Great! I've created an appointment for ${clients[0].first_name} ${clients[0].last_name} on ${format(startTime, "MMM d 'at' h:mm a")} for ${bookingDetails.service_type}.`
    };
  } catch (error) {
    console.error('Error in booking creation:', error);
    return {
      success: false,
      message: "Sorry, I encountered an error while trying to create the booking."
    };
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

    if (message.toLowerCase().includes('bookings') || message.toLowerCase().includes('appointments')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const isDetailRequest = message.toLowerCase().includes('detail') || 
                            message.toLowerCase().includes('more info') ||
                            message.toLowerCase().includes('tell me more');
      
      const bookings = await getBookingsForDate(supabaseClient, tomorrow);
      
      if (bookings) {
        const response = isDetailRequest || message.toLowerCase().includes('tomorrow') ? 
          await formatBookingDetails(bookings) :
          `There ${bookings.length === 1 ? 'is' : 'are'} ${bookings.length} booking${bookings.length === 1 ? '' : 's'} scheduled for tomorrow.`;
        
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    if (message.toLowerCase().includes('create') || 
        message.toLowerCase().includes('schedule') || 
        message.toLowerCase().includes('book') || 
        message.toLowerCase().includes('make appointment')) {
      const result = await attemptBookingCreation(supabaseClient, message);
      if (result) {
        return new Response(
          JSON.stringify({ response: result.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const generatedResponse = await handleGeneralQuery(message);
    if (generatedResponse) {
      return new Response(
        JSON.stringify({ response: generatedResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
