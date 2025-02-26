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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for "list vehicles" queries
    const listVehiclesMatch = message.toLowerCase().match(/list ([a-zA-Z ]+)'s vehicles/);
    if (listVehiclesMatch) {
      const clientName = listVehiclesMatch[1].trim();
      const nameParts = clientName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      console.log(`Looking up vehicles for ${firstName} ${lastName}`);

      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          clients!inner (
            first_name,
            last_name
          )
        `)
        .eq('clients.first_name', firstName)
        .eq('clients.last_name', lastName);

      if (error) {
        console.error('Vehicle lookup error:', error);
        return new Response(
          JSON.stringify({ 
            response: `I couldn't find any vehicles for ${clientName}.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (vehicles && vehicles.length > 0) {
        const vehicleList = vehicles.map(v => 
          `- ${v.year} ${v.make} ${v.model}${v.license_plate ? ` (Plate: ${v.license_plate})` : ''}`
        ).join('\n');
        
        return new Response(
          JSON.stringify({ 
            response: `${clientName}'s vehicles:\n${vehicleList}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: `${clientName} has no vehicles registered in our system.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for bay-related queries
    const bayMatch = message.toLowerCase().match(/bay|service bay|work bay/);
    if (bayMatch) {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (first_name, last_name),
          vehicles (make, model, year)
        `)
        .gte('start_time', new Date().toISOString())
        .order('start_time');

      if (error) throw error;

      const baySchedule = {
        bay1: appointments.filter(a => a.bay === 'bay1'),
        bay2: appointments.filter(a => a.bay === 'bay2'),
        mot: appointments.filter(a => a.bay === 'mot'),
      };

      const response = Object.entries(baySchedule).map(([bay, apps]) => {
        if (apps.length === 0) return `${bay.toUpperCase()}: Currently available`;
        const currentApp = apps[0];
        return `${bay.toUpperCase()}: ${currentApp.clients.first_name} ${currentApp.clients.last_name}'s ${currentApp.vehicles.year} ${currentApp.vehicles.make} ${currentApp.vehicles.model} - ${currentApp.service_type}`;
      }).join('\n');

      return new Response(
        JSON.stringify({ response: `Current bay status:\n${response}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for status count queries
    const statusMatch = message.toLowerCase().match(/tickets? (by|per) status|how many tickets/);
    if (statusMatch) {
      const { data, error } = await supabase
        .from('job_tickets')
        .select('status');

      if (error) throw error;

      const counts = data.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});

      const response = Object.entries(counts)
        .map(([status, count]) => `${status}: ${count} tickets`)
        .join('\n');

      return new Response(
        JSON.stringify({ response: `Ticket count by status:\n${response}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for client info queries
    const clientMatch = message.toLowerCase().match(/tell me about ([a-zA-Z ]+)/);
    if (clientMatch) {
      const clientName = clientMatch[1].trim();
      const nameParts = clientName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      const { data: client, error } = await supabase
        .from('clients')
        .select(`
          *,
          vehicles (
            id,
            make,
            model,
            year,
            license_plate
          ),
          appointments (
            id,
            start_time,
            service_type,
            status,
            bay
          ),
          job_tickets (
            id,
            ticket_number,
            status,
            description
          )
        `)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .single();

      if (error || !client) {
        return new Response(
          JSON.stringify({ response: `I couldn't find any information for ${clientName}.` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const vehicles = client.vehicles.map(v => 
        `${v.year} ${v.make} ${v.model}${v.license_plate ? ` (${v.license_plate})` : ''}`
      ).join(', ');

      const activeAppointments = client.appointments
        .filter(a => new Date(a.start_time) >= new Date())
        .map(a => `${new Date(a.start_time).toLocaleString()} - ${a.service_type} (Bay: ${a.bay || 'Not assigned'})`);

      const activeTickets = client.job_tickets
        .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
        .map(t => `${t.ticket_number} (${t.status})`);

      const response = `
Client Information for ${client.first_name} ${client.last_name}:
Contact: ${client.phone || 'No phone'} | ${client.email || 'No email'}
Address: ${client.address || 'No address on file'}

Vehicles: ${vehicles || 'No vehicles registered'}

Upcoming Appointments: ${activeAppointments.length ? '\n- ' + activeAppointments.join('\n- ') : 'None'}

Active Tickets: ${activeTickets.length ? '\n- ' + activeTickets.join('\n- ') : 'None'}
      `.trim();

      return new Response(
        JSON.stringify({ response }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for count queries
    const countMatch = message.toLowerCase().match(/how many (clients|tickets|appointments)/);
    if (countMatch) {
      const type = countMatch[1];
      const table = type === 'tickets' ? 'job_tickets' : type;
      
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({ response: `There are ${count} ${type} in the system.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for specific client vehicle query
    const clientVehicleMatch = message.toLowerCase().match(/what is ([a-zA-Z ]+)'s vehicle/);
    if (clientVehicleMatch) {
      const clientName = clientVehicleMatch[1].trim();
      
      // Split the name into first and last name
      const nameParts = clientName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          *,
          clients (
            first_name,
            last_name
          )
        `)
        .eq('clients.first_name', firstName)
        .eq('clients.last_name', lastName);

      if (vehiclesError) {
        console.error('Vehicle lookup error:', vehiclesError);
        return new Response(
          JSON.stringify({ 
            response: `I couldn't find any vehicles for ${clientName} in our system.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (vehicles && vehicles.length > 0) {
        const vehicleList = vehicles.map(v => 
          `${v.year} ${v.make} ${v.model}${v.license_plate ? ` (plate: ${v.license_plate})` : ''}`
        ).join(', ');
        return new Response(
          JSON.stringify({ 
            response: `${clientName} has ${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''} registered with us: ${vehicleList}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: `I couldn't find any vehicles registered for ${clientName}.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for license plate query
    const licensePlateMatch = message.toLowerCase().match(/whose car is ([a-z0-9]+)/);
    if (licensePlateMatch) {
      const licensePlate = licensePlateMatch[1];
      
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select(`
          *,
          clients (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('license_plate', licensePlate)
        .single();

      if (vehicleError) {
        console.error('Vehicle lookup error:', vehicleError);
        return new Response(
          JSON.stringify({ 
            response: `I couldn't find a vehicle with license plate ${licensePlate} in our system.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (vehicle) {
        return new Response(
          JSON.stringify({ 
            response: `The ${vehicle.year} ${vehicle.make} ${vehicle.model} (plate: ${vehicle.license_plate}) belongs to ${vehicle.clients.first_name} ${vehicle.clients.last_name}. ${vehicle.clients.phone ? `Their phone number is ${vehicle.clients.phone}.` : ''}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: `I couldn't find a vehicle with license plate ${licensePlate} in our system.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      throw new Error('Missing Gemini API key');
    }

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
If the user is asking about clients in general, respond with exactly: QUERY_CLIENTS
Otherwise, provide a helpful response about auto repair, maintenance, or general information.` }
              ]
            }
          ]
        })
      }
    );

    if (!aiResponse.ok) {
      throw new Error('Failed to get AI response');
    }

    const aiData = await aiResponse.json();
    if (!aiData.candidates || !aiData.candidates[0] || !aiData.candidates[0].content) {
      throw new Error('Invalid AI response format');
    }

    const aiText = aiData.candidates[0].content.parts[0].text;
    console.log('Processed AI text:', aiText);

    if (aiText === 'QUERY_APPOINTMENTS') {
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
    } else if (aiText === 'QUERY_JOB_TICKETS') {
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
    } else if (aiText === 'QUERY_CLIENTS') {
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
    } else {
      return new Response(
        JSON.stringify({ response: aiText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
