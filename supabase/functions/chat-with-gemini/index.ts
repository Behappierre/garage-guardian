
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? ''
    });

    async function processMessage(message: string) {
      const lowerMessage = message.toLowerCase();
      
      // Client name extraction regex
      const clientNameMatch = message.match(/(?:owned by|details for|does)\s+([A-Z][a-z]+ [A-Z][a-z]+)/);
      const licensePlateMatch = message.match(/license plate[:\s]+([A-Z0-9-]+)/i);
      const vinMatch = message.match(/VIN[:\s]+([A-Z0-9]+)/i);
      const technicianMatch = message.match(/(?:assigned to|for)\s+([A-Z][a-z]+ [A-Z][a-z]+)/);
      const ticketNumberMatch = message.match(/(?:JT-\d{6}-\d{4})/);
      
      // Vehicle queries
      if (lowerMessage.includes('show all vehicles') || lowerMessage.includes('list all vehicles')) {
        try {
          let query = supabaseClient.from('vehicles').select(`
            *,
            client:clients(first_name, last_name)
          `);

          // Filter for specific client's vehicles
          if (clientNameMatch) {
            const [firstName, lastName] = clientNameMatch[1].split(' ');
            query = query.eq('client.first_name', firstName)
                        .eq('client.last_name', lastName);
          }
          
          // Filter for specific make
          if (lowerMessage.includes('toyota')) {
            query = query.ilike('make', 'toyota');
          }

          const { data: vehicles, error } = await query;

          if (error) throw error;
          if (!vehicles?.length) return "No vehicles found matching your criteria.";

          return vehicles.map(v => 
            `${v.make} ${v.model} (${v.year}) - License: ${v.license_plate || 'N/A'}${v.client ? ` - Owner: ${v.client.first_name} ${v.client.last_name}` : ''}`
          ).join('\n');
        } catch (error) {
          console.error('Vehicle query error:', error);
          return "Error fetching vehicle information.";
        }
      }

      // Service history queries
      if (lowerMessage.includes('service history') || lowerMessage.includes('maintenance history')) {
        try {
          let query = supabaseClient.from('service_history').select(`
            *,
            vehicle:vehicles(*),
            client:clients(first_name, last_name)
          `);

          if (licensePlateMatch) {
            query = query.eq('vehicle.license_plate', licensePlateMatch[1]);
          } else if (vinMatch) {
            query = query.eq('vehicle.vin', vinMatch[1]);
          }

          // Last 6 months filter if specified
          if (lowerMessage.includes('last 6 months')) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            query = query.gte('service_date', sixMonthsAgo.toISOString());
          }

          const { data: services, error } = await query;

          if (error) throw error;
          if (!services?.length) return "No service history found matching your criteria.";

          return services.map(s => 
            `${new Date(s.service_date).toLocaleDateString()}: ${s.service_type} - ${s.description || 'No description'} (Cost: $${s.cost || 'N/A'})`
          ).join('\n');
        } catch (error) {
          console.error('Service history query error:', error);
          return "Error fetching service history.";
        }
      }

      // Job ticket queries
      if (lowerMessage.includes('job ticket') || lowerMessage.includes('tickets')) {
        try {
          let query = supabaseClient.from('job_tickets').select(`
            *,
            client:clients(first_name, last_name),
            vehicle:vehicles(make, model, license_plate),
            technician:profiles(first_name, last_name)
          `);

          if (lowerMessage.includes('active')) {
            query = query.in('status', ['received', 'in_progress']);
          } else if (lowerMessage.includes('pending parts')) {
            query = query.eq('status', 'pending_parts');
          } else if (lowerMessage.includes('completed')) {
            query = query.eq('status', 'completed');
          }

          if (technicianMatch) {
            const [firstName, lastName] = technicianMatch[1].split(' ');
            query = query.eq('technician.first_name', firstName)
                        .eq('technician.last_name', lastName);
          }

          if (ticketNumberMatch) {
            query = query.eq('ticket_number', ticketNumberMatch[0]);
          }

          if (lowerMessage.includes('high priority')) {
            query = query.eq('priority', 'high');
          }

          const { data: tickets, error } = await query;

          if (error) throw error;
          if (!tickets?.length) return "No job tickets found matching your criteria.";

          return tickets.map(t => 
            `Ticket ${t.ticket_number}: ${t.status.toUpperCase()} - Priority: ${t.priority}${t.client ? `\nClient: ${t.client.first_name} ${t.client.last_name}` : ''}${t.vehicle ? `\nVehicle: ${t.vehicle.make} ${t.vehicle.model} (${t.vehicle.license_plate || 'No plate'})` : ''}\nDescription: ${t.description}\n`
          ).join('\n---\n');
        } catch (error) {
          console.error('Job ticket query error:', error);
          return "Error fetching job tickets.";
        }
      }

      // Technician workload and time entries
      if (lowerMessage.includes('workload') || lowerMessage.includes('clock-in') || lowerMessage.includes('work hours')) {
        try {
          if (technicianMatch) {
            const [firstName, lastName] = technicianMatch[1].split(' ');
            
            // Get active job tickets
            const { data: activeJobs, error: jobsError } = await supabaseClient
              .from('job_tickets')
              .select(`
                *,
                technician:profiles!job_tickets_assigned_technician_id_fkey(first_name, last_name)
              `)
              .eq('technician.first_name', firstName)
              .eq('technician.last_name', lastName)
              .in('status', ['received', 'in_progress']);

            // Get clock events
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { data: clockEvents, error: clockError } = await supabaseClient
              .from('clock_events')
              .select('*')
              .eq('technician.first_name', firstName)
              .eq('technician.last_name', lastName)
              .gte('created_at', today.toISOString());

            if (jobsError || clockError) throw jobsError || clockError;

            let response = `Technician: ${firstName} ${lastName}\n`;
            response += `Active jobs: ${activeJobs?.length || 0}\n`;
            response += `Clock events today: ${clockEvents?.length || 0}`;

            return response;
          }
          return "Please specify a technician name.";
        } catch (error) {
          console.error('Technician query error:', error);
          return "Error fetching technician information.";
        }
      }

      // Client queries
      if (lowerMessage.includes('contact details') || lowerMessage.includes('clients')) {
        try {
          let query = supabaseClient.from('clients').select(`
            *,
            vehicles(count),
            appointments(count)
          `);

          if (clientNameMatch) {
            const [firstName, lastName] = clientNameMatch[1].split(' ');
            query = query.eq('first_name', firstName)
                        .eq('last_name', lastName);
          }

          const { data: clients, error } = await query;

          if (error) throw error;
          if (!clients?.length) return "No clients found matching your criteria.";

          return clients.map(c => 
            `${c.first_name} ${c.last_name}\nEmail: ${c.email || 'N/A'}\nPhone: ${c.phone || 'N/A'}\nAddress: ${c.address || 'N/A'}\nVehicles: ${c.vehicles?.[0]?.count || 0}\nAppointments: ${c.appointments?.[0]?.count || 0}\n`
          ).join('\n---\n');
        } catch (error) {
          console.error('Client query error:', error);
          return "Error fetching client information.";
        }
      }

      // For other queries, use OpenAI
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant at an auto repair shop. Answer questions about appointments, vehicles, and general automotive topics."
            },
            {
              role: "user", 
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

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
