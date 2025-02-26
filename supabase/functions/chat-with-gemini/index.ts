import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { format } from "https://deno.land/std@0.182.0/datetime/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getCompletion(message: string): Promise<string | null> {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const url = 'https://api.openai.com/v1/chat/completions';
  
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
  
    const body = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an automotive expert with deep knowledge of vehicle specifications, 
          particularly modern cars. Provide accurate, concise answers about vehicle specifications 
          and technical details. If you're not completely sure about a specific detail, 
          acknowledge that and provide any relevant information you are confident about.
          Format your responses with markdown for better readability.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
      });
  
      if (!response.ok) {
        console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
        return null;
      }
  
      const data = await response.json();
      const completion = data.choices[0].message.content;
      return completion;
  
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return null;
    }
}

function isGeneralAutomotiveQuery(message: string): boolean {
  const keywords = ['automotive', 'car', 'vehicle', 'maintenance', 'repair', 'service'];
  const messageLower = message.toLowerCase();
  return keywords.some(keyword => messageLower.includes(keyword));
}

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
    .select('*, vehicles!inner(*)', { count: 'exact' });
  
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    // Check for general automotive queries first
    if (isGeneralAutomotiveQuery(message)) {
      const completion = await getCompletion(message);
        if (completion) {
          return new Response(
            JSON.stringify({ response: completion }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ response: "I'm having trouble processing your request at the moment. Please try again later." }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Combined ticket counting and statistics logic
    const ticketStatusPattern = /(?:count |how many )?tickets?(?: in| with)? status ([a-z_]+)/i;
    const statusMatch = message.match(ticketStatusPattern);
    
    if (statusMatch || message.toLowerCase().includes('statistics') || 
        message.toLowerCase().includes('current stats') || 
        message.toLowerCase().includes('show stats')) {
      
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

    // New query handler for fetching job ticket details by ID
    const jobTicketPattern = /job ticket(?: details)?(?: for)?(?: id)? (\d+)/i;
    const jobTicketMatch = message.match(jobTicketPattern);

    if (jobTicketMatch) {
      const ticketId = jobTicketMatch[1];
      const { data: ticket, error } = await supabaseClient
        .from('job_tickets')
        .select(`
          *,
          clients ( first_name, last_name ),
          vehicles ( license_plate, make, model, year )
        `)
        .eq('id', ticketId)
        .single();

      if (error) {
        console.error('Error fetching job ticket:', error);
        return new Response(
          JSON.stringify({ response: `Error fetching job ticket with ID ${ticketId}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (ticket) {
        const formattedDate = format(new Date(ticket.created_at), 'MMMM dd, yyyy');
        let response = `**Job Ticket:** ${ticket.id}\n\n`;
        response += `• Date: ${formattedDate}\n`;
        response += `• Status: ${ticket.status}\n`;
        response += `• Bay: ${ticket.bay}\n`;
        response += `• Vehicle: ${ticket.vehicles?.make} ${ticket.vehicles?.model} (${ticket.vehicles?.year})\n`;
        response += `• License Plate: ${ticket.vehicles?.license_plate}\n`;
        response += `• Customer: ${ticket.clients?.first_name} ${ticket.clients?.last_name}\n\n`;
        response += `**Service Details:**\n${ticket.description}`;

        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ response: `Job ticket with ID ${ticketId} not found` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Query handler for appointments
    const appointmentPattern = /(?:show|list|view) appointments(?: for)?(?: vehicle)?(?: with license plate)? ?([a-zA-Z0-9-]+)?/i;
    const appointmentMatch = message.match(appointmentPattern);

    if (appointmentMatch) {
      const licensePlate = appointmentMatch[1];

      if (licensePlate) {
        // Fetch appointments for a specific vehicle
        const { data: appointments, error } = await supabaseClient
          .from('appointments')
          .select(`
            *,
            vehicles ( license_plate, make, model, year ),
            clients ( first_name, last_name )
          `)
          .eq('vehicles.license_plate', licensePlate);

        if (error) {
          console.error('Error fetching appointments:', error);
          return new Response(
            JSON.stringify({ response: `Error fetching appointments for license plate ${licensePlate}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (appointments && appointments.length > 0) {
          let response = `**Appointments for vehicle ${licensePlate}:**\n\n`;
          appointments.forEach(appointment => {
            const formattedDate = format(new Date(appointment.date), 'MMMM dd, yyyy');
            response += `• Date: ${formattedDate}\n`;
            response += `• Time: ${appointment.time}\n`;
            response += `• Description: ${appointment.description}\n\n`;
          });

          return new Response(
            JSON.stringify({ response }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ response: `No appointments found for vehicle with license plate ${licensePlate}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // If no license plate is provided, return a default message
        return new Response(
          JSON.stringify({ response: "Please specify a license plate to view appointments." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
