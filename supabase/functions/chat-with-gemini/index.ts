
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
If the user is asking about a specific client or clients in general, respond with exactly: QUERY_CLIENTS
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle job tickets query
    if (aiText.includes('QUERY_JOB_TICKETS')) {
      const { data: ticketStats, error: ticketsError } = await supabase
        .from('job_tickets')
        .select(`
          id,
          status,
          priority,
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
        .order('created_at', { ascending: false })
        .limit(5);

      if (ticketsError) {
        console.error('Database error:', ticketsError);
        throw ticketsError;
      }

      const inProgressCount = ticketStats.filter(t => t.status === 'in_progress').length;
      const recentTickets = ticketStats.map(ticket => ({
        client: ticket.clients ? `${ticket.clients.first_name} ${ticket.clients.last_name}` : 'Unknown',
        vehicle: ticket.vehicles ? `${ticket.vehicles.year} ${ticket.vehicles.make} ${ticket.vehicles.model}` : 'Unknown',
        status: ticket.status,
        priority: ticket.priority
      }));

      return new Response(
        JSON.stringify({ 
          response: `I've checked the system. Currently, there are ${inProgressCount} ticket${inProgressCount === 1 ? '' : 's'} in progress. Here are the 5 most recent tickets:\n\n${
            recentTickets.map((t, i) => 
              `${i + 1}. ${t.client}'s ${t.vehicle} - Status: ${t.status}, Priority: ${t.priority}`
            ).join('\n')}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle appointment queries
    if (aiText.includes('QUERY_APPOINTMENTS')) {
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
          ),
          job_tickets (
            ticket_number,
            status
          )
        `)
        .order('start_time', { ascending: true })
        .gte('start_time', new Date().toISOString())
        .limit(5);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      const formattedAppointments = appointments.map(apt => {
        const startTime = new Date(apt.start_time).toLocaleString();
        return `- ${apt.clients.first_name} ${apt.clients.last_name} at ${startTime}
          Vehicle: ${apt.vehicles ? `${apt.vehicles.year} ${apt.vehicles.make} ${apt.vehicles.model}` : 'Not specified'}
          Service: ${apt.service_type}
          ${apt.job_tickets ? `Job Ticket: ${apt.job_tickets.ticket_number} (${apt.job_tickets.status})` : ''}`;
      }).join('\n\n');

      return new Response(
        JSON.stringify({ 
          response: appointments.length > 0
            ? `Here are the next ${appointments.length} upcoming appointments:\n\n${formattedAppointments}`
            : "There are no upcoming appointments scheduled."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle client queries
    if (aiText.includes('QUERY_CLIENTS')) {
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          vehicles (
            make,
            model,
            year
          ),
          appointments (
            start_time,
            service_type,
            status
          ),
          job_tickets (
            ticket_number,
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (clientsError) {
        console.error('Database error:', clientsError);
        throw clientsError;
      }

      const formattedClients = clients.map(client => {
        const vehicles = client.vehicles?.length || 0;
        const activeTickets = client.job_tickets?.filter(t => t.status === 'in_progress')?.length || 0;
        const nextAppointment = client.appointments
          ?.filter(a => new Date(a.start_time) > new Date())
          ?.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

        return `- ${client.first_name} ${client.last_name}
          Vehicles: ${vehicles} registered
          Active tickets: ${activeTickets}
          ${nextAppointment ? `Next appointment: ${new Date(nextAppointment.start_time).toLocaleString()} - ${nextAppointment.service_type}` : 'No upcoming appointments'}`;
      }).join('\n\n');

      return new Response(
        JSON.stringify({ 
          response: clients.length > 0
            ? `Here are details for the 5 most recent clients:\n\n${formattedClients}`
            : "No clients found in the system."
        }),
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
