import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { format, addDays, startOfDay, endOfDay, subMonths } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    console.log('Received message:', message, 'from user:', user_id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    async function processMessage(message: string) {
      const lowerMessage = message.toLowerCase();

      // Job Tickets in Progress Query
      if (lowerMessage.includes('job tickets in progress') || lowerMessage.includes('show all job tickets in progress')) {
        const { data: tickets, error } = await supabaseClient
          .from('job_tickets')
          .select(`
            *,
            client:clients(
              first_name,
              last_name
            ),
            vehicle:vehicles(
              year,
              make,
              model,
              license_plate
            ),
            assigned_technician:profiles(
              first_name,
              last_name
            )
          `)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Job tickets query error:', error);
          throw error;
        }

        if (!tickets?.length) {
          return 'No job tickets currently in progress.';
        }

        return `Job tickets in progress:\n\n${tickets.map(ticket => (
          `Ticket: ${ticket.ticket_number}\n` +
          `Client: ${ticket.client ? `${ticket.client.first_name} ${ticket.client.last_name}` : 'No client assigned'}\n` +
          `Vehicle: ${ticket.vehicle ? `${ticket.vehicle.year} ${ticket.vehicle.make} ${ticket.vehicle.model}` : 'No vehicle assigned'}${ticket.vehicle?.license_plate ? ` (${ticket.vehicle.license_plate})` : ''}\n` +
          `Technician: ${ticket.assigned_technician ? `${ticket.assigned_technician.first_name} ${ticket.assigned_technician.last_name}` : 'Unassigned'}\n` +
          `Priority: ${ticket.priority}\n` +
          `Description: ${ticket.description}\n` +
          '---'
        )).join('\n\n')}`;
      }

      // Client Vehicle Query
      const clientVehicleMatch = message.match(/vehicles owned by (.+)/i);
      if (clientVehicleMatch) {
        const clientName = clientVehicleMatch[1].trim();
        const { data: vehicles, error } = await supabaseClient
          .from('vehicles')
          .select(`
            *,
            client:clients!inner(
              first_name,
              last_name
            )
          `)
          .filter('client.first_name', 'ilike', `%${clientName}%`)
          .or(`client.last_name.ilike.%${clientName}%`);

        if (error) throw error;
        if (!vehicles?.length) return `No vehicles found for client "${clientName}"`;

        return `Vehicles owned by ${clientName}:\n\n` + 
          vehicles.map(v => `• ${v.year} ${v.make} ${v.model}${v.license_plate ? ` (${v.license_plate})` : ''}`).join('\n');
      }

      // Make-specific Query
      const makeMatch = message.match(/list all (\w+) vehicles/i);
      if (makeMatch) {
        const make = makeMatch[1];
        const { data: vehicles, error } = await supabaseClient
          .from('vehicles')
          .select('*, client:clients(first_name, last_name)')
          .ilike('make', make);

        if (error) throw error;
        if (!vehicles?.length) return `No ${make} vehicles found in the system`;

        return `${make} vehicles in system:\n\n` + 
          vehicles.map(v => `• ${v.year} ${v.make} ${v.model} - Owner: ${v.client?.first_name} ${v.client?.last_name}`).join('\n');
      }

      // Recent Service History Query
      if (message.toLowerCase().includes('service history in the last 6 months')) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: services, error } = await supabaseClient
          .from('service_history')
          .select(`
            *,
            vehicle:vehicles(
              year,
              make,
              model,
              license_plate
            )
          `)
          .gte('service_date', sixMonthsAgo.toISOString())
          .order('service_date', { ascending: false });

        if (error) throw error;
        if (!services?.length) return 'No services found in the last 6 months';

        return `Services in last 6 months:\n\n` + 
          services.map(s => {
            const vehicle = s.vehicle;
            return `• ${format(new Date(s.service_date), 'MMM d, yyyy')} - ${s.service_type}\n  Vehicle: ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}\n  Cost: ${s.cost ? `$${s.cost}` : 'N/A'}`;
          }).join('\n\n');
      }

      // License Plate Service History
      const plateHistoryMatch = message.match(/service history for ([A-Z0-9]+)/i);
      if (plateHistoryMatch) {
        const plate = plateHistoryMatch[1].toUpperCase();
        const { data: services, error } = await supabaseClient
          .from('service_history')
          .select(`
            *,
            vehicle:vehicles!inner(
              year,
              make,
              model,
              license_plate
            )
          `)
          .eq('vehicle.license_plate', plate)
          .order('service_date', { ascending: false });

        if (error) throw error;
        if (!services?.length) return `No service history found for license plate ${plate}`;

        return `Service history for ${plate}:\n\n` + 
          services.map(s => `• ${format(new Date(s.service_date), 'MMM d, yyyy')} - ${s.service_type}\n  Cost: ${s.cost ? `$${s.cost}` : 'N/A'}`).join('\n\n');
      }

      // Job Tickets Query
      if (message.toLowerCase().includes('show all active job tickets')) {
        const { data: tickets, error } = await supabaseClient
          .from('job_tickets')
          .select(`
            *,
            client:clients(first_name, last_name),
            vehicle:vehicles(year, make, model, license_plate),
            technician:profiles(first_name, last_name)
          `)
          .in('status', ['received', 'in_progress', 'pending_parts']);

        if (error) throw error;
        if (!tickets?.length) return 'No active job tickets found';

        return `Active job tickets:\n\n` + 
          tickets.map(t => {
            const client = t.client;
            const vehicle = t.vehicle;
            const tech = t.technician;
            return `Ticket: ${t.ticket_number}\nStatus: ${t.status}\nClient: ${client?.first_name} ${client?.last_name}\nVehicle: ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}\nTechnician: ${tech ? `${tech.first_name} ${tech.last_name}` : 'Unassigned'}\n---`;
          }).join('\n\n');
      }

      // Check for appointment queries
      if (lowerMessage.includes('booking') || lowerMessage.includes('appointment')) {
        try {
          console.log('Processing appointment query');
          let startDate, endDate;
          
          // Parse the time frame from the message
          if (lowerMessage.includes('tomorrow')) {
            startDate = startOfDay(addDays(new Date(), 1));
            endDate = endOfDay(addDays(new Date(), 1));
          } else if (lowerMessage.includes('today')) {
            startDate = startOfDay(new Date());
            endDate = endOfDay(new Date());
          } else {
            startDate = startOfDay(new Date());
            endDate = endOfDay(addDays(new Date(), 7)); // Default to next 7 days
          }

          console.log('Querying appointments between:', startDate, 'and', endDate);
          
          const { data: appointments, error } = await supabaseClient
            .from('appointments')
            .select(`
              *,
              client:clients(
                first_name,
                last_name
              ),
              vehicle:vehicles(
                make,
                model,
                year,
                license_plate
              )
            `)
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString())
            .order('start_time', { ascending: true });

          if (error) {
            console.error('Appointment query error:', error);
            throw error;
          }

          if (!appointments || appointments.length === 0) {
            return `No appointments found for the specified time period.`;
          }

          // Format the appointments into a readable response
          const formattedAppointments = appointments.map(apt => {
            const clientName = apt.client ? `${apt.client.first_name} ${apt.client.last_name}` : 'No client name';
            const vehicleInfo = apt.vehicle ? 
              `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}${apt.vehicle.license_plate ? ` (${apt.vehicle.license_plate})` : ''}` : 
              'No vehicle info';
            
            return `• ${format(new Date(apt.start_time), 'h:mm a')} - ${clientName}\n  ${apt.service_type}\n  Vehicle: ${vehicleInfo}`;
          }).join('\n\n');

          const timeFrame = lowerMessage.includes('tomorrow') ? 'tomorrow' : 
                          lowerMessage.includes('today') ? 'today' : 
                          'the next 7 days';

          return `Here are the appointments for ${timeFrame}:\n\n${formattedAppointments}`;
        } catch (error) {
          console.error('Error processing appointment query:', error);
          return `Sorry, I couldn't retrieve the appointment information. Error: ${error.message}`;
        }
      }

      // License plate query
      const licensePlateMatch = message.match(/(?:whose|who owns|find|car).*\b([A-Z0-9]{3,7})\b/i);
      
      if (licensePlateMatch) {
        try {
          const licensePlate = licensePlateMatch[1].toUpperCase();
          console.log('Searching for license plate:', licensePlate);
          
          const { data: vehicle, error } = await supabaseClient
            .from('vehicles')
            .select(`
              id,
              make,
              model,
              year,
              license_plate,
              client:clients!inner(
                id,
                first_name,
                last_name,
                email,
                phone
              )
            `)
            .ilike('license_plate', licensePlate)
            .maybeSingle();

          console.log('Query result:', { vehicle, error });

          if (error) {
            console.error('Database error:', error);
            throw error;
          }
          
          if (!vehicle) {
            return `No vehicle found with license plate ${licensePlate}.`;
          }

          return `Vehicle Details:\n\n` +
                 `Make: ${vehicle.make}\n` +
                 `Model: ${vehicle.model}\n` +
                 `Year: ${vehicle.year}\n` +
                 `Owner: ${vehicle.client.first_name} ${vehicle.client.last_name}\n` +
                 `Contact: ${vehicle.client.phone || 'No phone'} / ${vehicle.client.email || 'No email'}`;
        } catch (error) {
          console.error('Vehicle query error:', error);
          return `Error fetching vehicle information. Details: ${error.message}`;
        }
      }

      // For non-specific queries, use OpenAI
      try {
        console.log('Using OpenAI for general query');
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant at an auto repair shop specializing in European vehicles. Answer questions about vehicles, maintenance, repairs, and automotive specifications."
            },
            {
              role: "user", 
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        console.log('OpenAI response:', completion.choices[0]);
        return completion.choices[0].message.content || "I'm sorry, I couldn't process that request.";
      } catch (error) {
        console.error('OpenAI error:', error);
        return "I apologize, but I'm having trouble processing your request at the moment. Please try again.";
      }
    }

    const response = await processMessage(message);
    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Request error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
