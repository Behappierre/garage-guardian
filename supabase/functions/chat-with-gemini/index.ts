import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { format } from "https://deno.land/std@0.182.0/datetime/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function queryClientByName(supabase: any, name: string) {
  const names = name.toLowerCase().split(' ');
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      vehicles (
        *
      ),
      appointments:appointments(
        *
      ),
      job_tickets(
        *
      )
    `)
    .or(`first_name.ilike.%${names[0]}%,last_name.ilike.%${names[0]}%`);

  if (error) {
    console.error('Error querying client:', error);
    return null;
  }

  return data;
}

async function queryTicketsByStatus(supabase: any, status: string) {
  const { data, error } = await supabase
    .from('job_tickets')
    .select(`
      *,
      client:clients(*),
      vehicle:vehicles(*)
    `)
    .eq('status', status);

  if (error) {
    console.error('Error querying tickets by status:', error);
    return null;
  }

  return data;
}

async function queryBayStatus(supabase: any, bay?: string) {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      client:clients(*),
      vehicle:vehicles(*),
      job_tickets(*)
    `)
    .eq('status', 'scheduled');

  if (bay) {
    query = query.eq('bay', bay);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error querying bay status:', error);
    return null;
  }

  return data;
}

async function getStats(supabase: any) {
  const [clients, tickets, appointments] = await Promise.all([
    supabase.from('clients').select('count', { count: 'exact' }),
    supabase.from('job_tickets').select('count', { count: 'exact' }),
    supabase.from('appointments').select('count', { count: 'exact' })
  ]);

  return {
    clients: clients.count,
    tickets: tickets.count,
    appointments: appointments.count
  };
}

async function countAppointments(supabase: any, params: {
  bay?: string;
  clientId?: string;
  future?: boolean;
  past?: boolean;
}) {
  let query = supabase.from('appointments').select('*', { count: 'exact' });
  
  if (params.bay) {
    query = query.eq('bay', params.bay);
  }
  
  if (params.clientId) {
    query = query.eq('client_id', params.clientId);
  }
  
  const now = new Date().toISOString();
  if (params.future) {
    query = query.gte('start_time', now);
  } else if (params.past) {
    query = query.lt('start_time', now);
  }

  const { count, error } = await query;
  
  if (error) {
    console.error('Error counting appointments:', error);
    return null;
  }
  
  return count;
}

async function countJobTickets(supabase: any, params: {
  clientId?: string;
  vehicleId?: string;
  licensePlate?: string;
  bay?: string;
  status?: string;
  technicianId?: string;
}) {
  let query = supabase
    .from('job_tickets')
    .select('*, vehicles!inner(*)', { count: 'exact' });
  
  if (params.clientId) {
    query = query.eq('client_id', params.clientId);
  }
  
  if (params.vehicleId) {
    query = query.eq('vehicle_id', params.vehicleId);
  }
  
  if (params.licensePlate) {
    query = query.eq('vehicles.license_plate', params.licensePlate);
  }
  
  if (params.status) {
    query = query.eq('status', params.status);
  }
  
  if (params.technicianId) {
    query = query.eq('assigned_technician_id', params.technicianId);
  }

  const { count, error } = await query;
  
  if (error) {
    console.error('Error counting job tickets:', error);
    return null;
  }
  
  return count;
}

async function getAppointmentTickets(supabase: any, appointmentId: string) {
  const { data, error } = await supabase
    .from('appointment_job_tickets')
    .select(`
      appointment:appointments!inner(*),
      job_ticket:job_tickets!inner(
        *,
        client:clients(*),
        vehicle:vehicles(*)
      )
    `)
    .eq('appointment_id', appointmentId);

  if (error) {
    console.error('Error fetching appointment tickets:', error);
    return null;
  }

  return data;
}

async function getTicketAppointments(supabase: any, ticketId: string) {
  const { data, error } = await supabase
    .from('appointment_job_tickets')
    .select(`
      job_ticket:job_tickets!inner(*),
      appointment:appointments!inner(
        *,
        client:clients(*),
        vehicle:vehicles(*)
      )
    `)
    .eq('job_ticket_id', ticketId);

  if (error) {
    console.error('Error fetching ticket appointments:', error);
    return null;
  }

  return data;
}

function isGeneralAutomotiveQuery(message: string): boolean {
  const generalPatterns = [
    /how many (cylinders|hp|cc|doors|seats)/i,
    /(what|which) engine/i,
    /fuel (consumption|economy)/i,
    /(mpg|fuel type|transmission)/i,
    /specifications? for/i,
    /specs? (of|for)/i,
    /what (year|model|make)/i,
    /engine (size|capacity|displacement)/i
  ];

  return generalPatterns.some(pattern => pattern.test(message));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    if (isGeneralAutomotiveQuery(message)) {
      console.log('Processing general automotive query with OpenAI');
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      
      if (!OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not configured');
        return new Response(
          JSON.stringify({ 
            error: 'OPENAI_API_KEY is not configured',
            response: 'Configuration error - please contact support.'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        })
      });

      const openAiData = await response.json();
      return new Response(
        JSON.stringify({ response: openAiData.choices[0].message.content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Client name query
    const clientNameMatch = message.match(/what (?:car|vehicle|address|phone|appointment|ticket)s? (?:does|has|have) ([a-zA-Z ]+)/i);
    if (clientNameMatch) {
      const clientName = clientNameMatch[1];
      const clientData = await queryClientByName(supabaseClient, clientName);
      
      if (clientData && clientData.length > 0) {
        const client = clientData[0];
        let response = `**Information for ${client.first_name} ${client.last_name}:**\n\n`;
        
        if (message.toLowerCase().includes('car') || message.toLowerCase().includes('vehicle')) {
          response += "**Vehicles:**\n";
          client.vehicles.forEach((vehicle: any) => {
            response += `- ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            if (vehicle.license_plate) response += ` (${vehicle.license_plate})`;
            response += '\n';
          });
        }
        
        if (message.toLowerCase().includes('address')) {
          response += `\n**Address:** ${client.address || 'No address on file'}\n`;
        }
        
        if (message.toLowerCase().includes('phone')) {
          response += `\n**Phone:** ${client.phone || 'No phone number on file'}\n`;
        }
        
        if (message.toLowerCase().includes('appointment')) {
          response += "\n**Appointments:**\n";
          client.appointments.forEach((apt: any) => {
            response += `- ${format(new Date(apt.start_time), "MMM dd, yyyy HH:mm")} - ${apt.service_type}\n`;
          });
        }
        
        if (message.toLowerCase().includes('ticket')) {
          response += "\n**Job Tickets:**\n";
          client.job_tickets.forEach((ticket: any) => {
            response += `- ${ticket.ticket_number} - Status: ${ticket.status}\n`;
          });
        }
        
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Vehicle ownership query
    const licensePlateMatch = message.match(/whose(?:\s+car(?:\s+is)?|\s+vehicle(?:\s+is)?)?\s+([a-zA-Z0-9]+)/i);
    if (licensePlateMatch) {
      const licensePlate = licensePlateMatch[1];
      const { data: vehicleData, error: vehicleError } = await supabaseClient
        .from('vehicles')
        .select(`
          license_plate,
          client:clients (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('license_plate', licensePlate)
        .single();

      if (!vehicleError && vehicleData?.client) {
        const response = `The vehicle with license plate ${licensePlate} belongs to ${vehicleData.client.first_name} ${vehicleData.client.last_name}.\n\n`;
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Status query
    const statusMatch = message.match(/(?:show|list|get|what are)(?: the)? tickets? (?:with )?status(?: of)? ([a-zA-Z_]+)/i);
    if (statusMatch) {
      const status = statusMatch[1].toLowerCase();
      const tickets = await queryTicketsByStatus(supabaseClient, status);
      if (tickets) {
        let response = `**Job Tickets with status "${status}":**\n\n`;
        tickets.forEach((ticket: any) => {
          response += `- Ticket ${ticket.ticket_number}\n`;
          response += `  Client: ${ticket.client?.first_name} ${ticket.client?.last_name}\n`;
          if (ticket.vehicle) {
            response += `  Vehicle: ${ticket.vehicle.year} ${ticket.vehicle.make} ${ticket.vehicle.model}\n`;
          }
          response += '\n';
        });
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Bay query
    const bayMatch = message.match(/(?:what|who)(?:'s| is)(?: in)? bay ([0-9]+)/i);
    if (bayMatch) {
      const bay = bayMatch[1];
      const appointments = await queryBayStatus(supabaseClient, bay);
      if (appointments) {
        let response = `**Current status for Bay ${bay}:**\n\n`;
        appointments.forEach((apt: any) => {
          response += `- ${format(new Date(apt.start_time), "HH:mm")} - ${apt.service_type}\n`;
          response += `  Client: ${apt.client?.first_name} ${apt.client?.last_name}\n`;
          if (apt.vehicle) {
            response += `  Vehicle: ${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}\n`;
          }
          response += '\n';
        });
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Stats query
    if (message.toLowerCase().includes('count') || message.toLowerCase().includes('how many')) {
      const stats = await getStats(supabaseClient);
      let response = "**Current Statistics:**\n\n";
      response += `- Total Clients: ${stats.clients}\n`;
      response += `- Total Job Tickets: ${stats.tickets}\n`;
      response += `- Total Appointments: ${stats.appointments}\n`;
      return new Response(
        JSON.stringify({ response }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Appointment count queries
    const appointmentCountMatch = message.match(/(?:count|how many) appointments?(?: for)?(?: bay)?(?: client)?(?: past)?(?: future)? ?([0-9]+)?/i);
    if (appointmentCountMatch) {
      const bay = appointmentCountMatch[1];
      const isFuture = message.toLowerCase().includes('future');
      const isPast = message.toLowerCase().includes('past');
      
      const count = await countAppointments(supabaseClient, {
        bay,
        future: isFuture,
        past: isPast
      });

      let timeFrame = '';
      if (isFuture) timeFrame = 'future ';
      if (isPast) timeFrame = 'past ';
      
      let response = `**Appointment Count:**\n\n`;
      if (bay) {
        response += `There ${count === 1 ? 'is' : 'are'} ${count} ${timeFrame}appointment${count === 1 ? '' : 's'} for Bay ${bay}`;
      } else {
        response += `Total ${timeFrame}appointments: ${count}`;
      }
      
      return new Response(
        JSON.stringify({ response }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Job ticket count queries
    const ticketCountMatch = message.match(/(?:count|how many) (?:job )?tickets?(?: for)? ?(?:status|client|car|registration|bay|tech)? ?([a-zA-Z0-9]+)?/i);
    if (ticketCountMatch) {
      const param = ticketCountMatch[1];
      let queryParams: any = {};
      
      if (message.includes('status')) {
        queryParams.status = param;
      } else if (message.includes('registration')) {
        queryParams.licensePlate = param;
      } else if (message.includes('bay')) {
        queryParams.bay = param;
      } else if (message.includes('tech')) {
        queryParams.technicianId = param;
      }
      
      const count = await countJobTickets(supabaseClient, queryParams);
      
      let response = `**Job Ticket Count:**\n\n`;
      if (param) {
        response += `There ${count === 1 ? 'is' : 'are'} ${count} ticket${count === 1 ? '' : 's'} `;
        if (queryParams.status) response += `with status "${param}"`;
        else if (queryParams.licensePlate) response += `for vehicle ${param}`;
        else if (queryParams.bay) response += `in Bay ${param}`;
        else if (queryParams.technicianId) response += `assigned to technician ${param}`;
      } else {
        response += `Total tickets: ${count}`;
      }
      
      return new Response(
        JSON.stringify({ response }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Appointment-Ticket relationship queries
    const appointmentTicketsMatch = message.match(/(?:show|list|get) tickets? for appointment ([A-Za-z0-9-]+)/i);
    if (appointmentTicketsMatch) {
      const appointmentId = appointmentTicketsMatch[1];
      const tickets = await getAppointmentTickets(supabaseClient, appointmentId);
      
      if (tickets) {
        let response = `**Job Tickets for Appointment ${appointmentId}:**\n\n`;
        tickets.forEach((record: any) => {
          const ticket = record.job_ticket;
          response += `- ${ticket.ticket_number}\n`;
          response += `  Status: ${ticket.status}\n`;
          if (ticket.client) {
            response += `  Client: ${ticket.client.first_name} ${ticket.client.last_name}\n`;
          }
          if (ticket.vehicle) {
            response += `  Vehicle: ${ticket.vehicle.year} ${ticket.vehicle.make} ${ticket.vehicle.model}\n`;
          }
          response += '\n';
        });
        
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const ticketAppointmentsMatch = message.match(/(?:show|list|get) appointments? for ticket ([A-Za-z0-9-]+)/i);
    if (ticketAppointmentsMatch) {
      const ticketId = ticketAppointmentsMatch[1];
      const appointments = await getTicketAppointments(supabaseClient, ticketId);
      
      if (appointments) {
        let response = `**Appointments for Job Ticket ${ticketId}:**\n\n`;
        appointments.forEach((record: any) => {
          const apt = record.appointment;
          response += `- ${format(new Date(apt.start_time), "MMM dd, yyyy HH:mm")}\n`;
          response += `  Service: ${apt.service_type}\n`;
          if (apt.bay) response += `  Bay: ${apt.bay}\n`;
          if (apt.client) {
            response += `  Client: ${apt.client.first_name} ${apt.client.last_name}\n`;
          }
          response += '\n';
        });
        
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    console.log('Processing with OpenAI API');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ 
          error: 'OPENAI_API_KEY is not configured',
          response: 'Configuration error - please contact support.'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const systemPrompt = `You are an experienced auto repair shop manager and database expert. Your responsibilities include:

1. Workshop Management:
- Providing expert advice on automotive repairs and maintenance
- Managing service scheduling and workflow
- Handling customer inquiries about services and repairs
- Making recommendations based on vehicle history and common issues
- Explaining technical concepts in simple terms
- Discussing pricing and time estimates for repairs

2. Database Knowledge:
You understand the following database schema:
- Appointments: tracks service appointments (client_id, vehicle_id, start_time, end_time, status, service_type, notes, bay)
- Clients: stores customer information (first_name, last_name, email, phone, notes, address)
- Vehicles: maintains vehicle records (make, model, year, VIN, license_plate, client_id)
- Job_tickets: manages service tickets (client_id, vehicle_id, status, priority, description)
- Service_history: tracks completed services (client_id, vehicle_id, service_type, cost, description)

When asked about data or reports, format your responses clearly and professionally. Keep your responses friendly, practical, and focused on helping manage the auto repair business efficiently.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    });

    const data = await openaiResponse.json();
    console.log('OpenAI API response:', data);

    if (!openaiResponse.ok) {
      console.error('OpenAI API error response:', data);
      return new Response(
        JSON.stringify({ 
          error: `OpenAI API Error: ${data.error?.message || 'Unknown error'}`,
          response: 'Failed to get response from AI assistant.'
        }),
        { 
          status: openaiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response structure from OpenAI:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response structure from OpenAI API',
          response: 'Unexpected response format from AI assistant.'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const aiResponse = data.choices[0].message.content;
    return new Response(
      JSON.stringify({ response: aiResponse }),
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
    const today = startDate.getDay();
    endDate.setDate(endDate.getDate() + (6 - today));
  }

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
