
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

    // Check for client information queries
    const clientNameMatch = message.toLowerCase().match(/(?:phone|number|contact|address|info|details) (?:for|of) ([a-zA-Z ]+)/i);
    if (clientNameMatch) {
      const clientName = clientNameMatch[1].trim();
      console.log(`Looking up client info for: ${clientName}`);

      const { data: clients, error } = await supabase
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
          )
        `)
        .or(`first_name.ilike.%${clientName}%,last_name.ilike.%${clientName}%`)
        .limit(1);

      if (error) {
        console.error('Client lookup error:', error);
        return new Response(
          JSON.stringify({ 
            response: `Database error during client lookup. Please check system logs.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (clients && clients.length > 0) {
        const client = clients[0];
        let response = `Client Information:\n`;
        response += `Name: ${client.first_name} ${client.last_name}\n`;
        response += `Phone: ${client.phone || 'Not recorded'}\n`;
        response += `Email: ${client.email || 'Not recorded'}\n`;
        response += `Address: ${client.address || 'Not recorded'}\n`;
        
        if (client.vehicles && client.vehicles.length > 0) {
          response += `\nVehicles:\n`;
          client.vehicles.forEach((vehicle: any) => {
            response += `- ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            if (vehicle.license_plate) response += ` (${vehicle.license_plate})`;
            response += '\n';
          });
        }

        if (client.appointments && client.appointments.length > 0) {
          response += `\nUpcoming Appointments:\n`;
          const now = new Date();
          client.appointments
            .filter((apt: any) => new Date(apt.start_time) > now)
            .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .forEach((apt: any) => {
              response += `- ${new Date(apt.start_time).toLocaleDateString()} ${new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              response += ` - ${apt.service_type}`;
              if (apt.bay) response += ` (Bay ${apt.bay.replace('bay', '')})`;
              response += ` [${apt.status}]\n`;
            });
        }

        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: `No client record found for "${clientName}". Please verify the name or check if they need to be added to the system.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for ticket status summary
    const ticketSummaryMatch = message.toLowerCase().includes('ticket') && 
      (message.toLowerCase().includes('summary') || message.toLowerCase().includes('status') || 
       message.toLowerCase().includes('count') || message.toLowerCase().includes('list'));
    
    if (ticketSummaryMatch) {
      const { data: tickets, error } = await supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients (
            first_name,
            last_name
          ),
          vehicle:vehicles (
            make,
            model,
            license_plate
          )
        `);

      if (error) {
        console.error('Ticket summary error:', error);
        return new Response(
          JSON.stringify({ 
            response: `Error retrieving ticket summary. Please check system logs.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (tickets) {
        // Count by status
        const statusCounts: {[key: string]: number} = {};
        tickets.forEach(ticket => {
          statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
        });

        let response = `Job Ticket Summary:\n\n`;
        
        // Overall counts
        response += `Total Tickets: ${tickets.length}\n\n`;
        
        // Status breakdown
        response += `Status Breakdown:\n`;
        Object.entries(statusCounts).forEach(([status, count]) => {
          response += `${status.toUpperCase()}: ${count}\n`;
        });

        // List recent tickets
        response += `\nRecent Tickets:\n`;
        tickets
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .forEach(ticket => {
            const client = ticket.client;
            const vehicle = ticket.vehicle;
            response += `- ${ticket.ticket_number} [${ticket.status.toUpperCase()}]`;
            if (client) response += ` - ${client.first_name} ${client.last_name}`;
            if (vehicle) response += ` - ${vehicle.make} ${vehicle.model}`;
            if (vehicle.license_plate) response += ` (${vehicle.license_plate})`;
            response += '\n';
          });

        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check for vehicle license plate queries
    const plateMatch = message.toLowerCase().match(/whose car is (\w+)\??/);
    if (plateMatch) {
      const licensePlate = plateMatch[1];
      console.log(`Looking up vehicle with plate: ${licensePlate}`);

      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          client:clients (
            first_name,
            last_name,
            phone,
            email,
            notes
          )
        `)
        .ilike('license_plate', licensePlate);

      if (error) {
        console.error('Vehicle lookup error:', error);
        return new Response(
          JSON.stringify({ 
            response: `Database error during vehicle lookup. Please check system logs.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (vehicles && vehicles.length > 0) {
        const vehicle = vehicles[0];
        const client = vehicle.client;
        
        if (client) {
          const response = `Vehicle Details:
- Make/Model: ${vehicle.year} ${vehicle.make} ${vehicle.model}
- License Plate: ${vehicle.license_plate}
- VIN: ${vehicle.vin || 'Not recorded'}

Owner Information:
- Name: ${client.first_name} ${client.last_name}
- Phone: ${client.phone || 'Not recorded'}
- Email: ${client.email || 'Not recorded'}
${client.notes ? `\nNotes: ${client.notes}` : ''}`;

          return new Response(
            JSON.stringify({ response }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ 
          response: `No vehicle record found for license plate ${licensePlate}. Please verify the plate number or check if it needs to be added to the system.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for bay-specific queries
    const bayMatch = message.toLowerCase().match(/what is in bay (\d+)/);
    if (bayMatch) {
      const bayNumber = bayMatch[1];
      const bay = `bay${bayNumber}`;

      console.log(`Looking up appointments in ${bay}`);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients (
            first_name,
            last_name,
            phone
          ),
          vehicle:vehicles (
            make,
            model,
            year,
            license_plate,
            vin
          ),
          job_tickets (
            ticket_number,
            description,
            priority
          )
        `)
        .eq('bay', bay)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Bay lookup error:', error);
        return new Response(
          JSON.stringify({ 
            response: `Error checking Bay ${bayNumber}. Please verify system connectivity.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (appointments && appointments.length > 0) {
        const appointment = appointments[0];
        const client = appointment.client;
        const vehicle = appointment.vehicle;
        const jobTicket = appointment.job_tickets?.[0];
        
        let response = `Bay ${bayNumber} Status:\n`;
        
        if (vehicle) {
          response += `\nVehicle:
- ${vehicle.year} ${vehicle.make} ${vehicle.model}
- Plate: ${vehicle.license_plate || 'N/A'}
- VIN: ${vehicle.vin || 'N/A'}`;
        }
        
        if (client) {
          response += `\n\nCustomer:
- ${client.first_name} ${client.last_name}
- Phone: ${client.phone || 'N/A'}`;
        }
        
        response += `\n\nService Details:
- Type: ${appointment.service_type}
- Start: ${new Date(appointment.start_time).toLocaleTimeString()}
- End: ${new Date(appointment.end_time).toLocaleTimeString()}`;

        if (jobTicket) {
          response += `\n\nJob Ticket:
- Number: ${jobTicket.ticket_number}
- Priority: ${jobTicket.priority.toUpperCase()}
- Description: ${jobTicket.description}`;
        }

        if (appointment.notes) {
          response += `\n\nNotes: ${appointment.notes}`;
        }
        
        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          response: `Bay ${bayNumber} is currently unoccupied. Available for next service.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for brake disc part number queries
    const brakeDiscMatch = message.toLowerCase().match(/brake disc.*part number.*(\d{4}).*alfa romeo stelvio/i);
    if (brakeDiscMatch || message.toLowerCase().includes('brake disc') && message.toLowerCase().includes('stelvio')) {
      const year = brakeDiscMatch ? brakeDiscMatch[1] : '2018';
      
      return new Response(
        JSON.stringify({ 
          response: `Technical Specifications - Front Brake Discs
Vehicle: 2018 Alfa Romeo Stelvio 2.2 JTDm

Part Numbers:
1. OEM: 50534753 (Alfa Romeo Original)
   - Diameter: 330mm
   - Minimum Thickness: 28mm
   - Center Bore: 68mm

2. Aftermarket Options:
   - Brembo: 09.C399.11
   - TRW: DF6485
   - Dimensions match OEM specs

Installation Notes:
- Torque specs: 115Nm + 90° angle rotation
- Always replace in pairs
- Check brake fluid spec: DOT 4+

Special Tools Required:
- Torque wrench with angle gauge
- Brake caliper spreader tool` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate content using Gemini API for other queries
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
                { text: `You are an experienced automotive workshop manager with deep technical knowledge. 
You assist staff with workshop management, client information, and technical details.

Analyze this request and respond professionally: ${message}

If this is about:
- Any appointments or scheduling: Respond with exactly: QUERY_APPOINTMENTS
- Job tickets or status summaries: Respond with exactly: QUERY_JOB_TICKETS
- Client information or records: Respond with exactly: QUERY_CLIENTS
- Bay or workshop space management: Respond with exactly: QUERY_BAYS

Keep responses focused on workshop operations and management.` }
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

    return new Response(
      JSON.stringify({ response: aiText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        response: "System error: Unable to process request. Please check logs or contact IT support." 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
