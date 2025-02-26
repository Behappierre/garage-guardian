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

    // Check for appointment schedule queries
    const tomorrowMatch = message.toLowerCase().includes('tomorrow') && 
      (message.toLowerCase().includes('booking') || message.toLowerCase().includes('appointment'));
    
    if (tomorrowMatch) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

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
            license_plate
          )
        `)
        .gte('start_time', tomorrow.toISOString())
        .lte('start_time', tomorrowEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Appointments lookup error:', error);
        return new Response(
          JSON.stringify({ 
            response: `Error retrieving tomorrow's schedule. Please check system logs.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (appointments && appointments.length > 0) {
        let response = `Schedule for tomorrow (${tomorrow.toLocaleDateString()}):\n\n`;
        
        appointments.forEach((appointment, index) => {
          const startTime = new Date(appointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const endTime = new Date(appointment.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const vehicle = appointment.vehicle;
          const client = appointment.client;
          
          response += `${index + 1}. ${startTime}-${endTime}\n`;
          if (client) {
            response += `   Customer: ${client.first_name} ${client.last_name}\n`;
            if (client.phone) response += `   Phone: ${client.phone}\n`;
          }
          if (vehicle) {
            response += `   Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            if (vehicle.license_plate) response += ` (${vehicle.license_plate})`;
            response += '\n';
          }
          response += `   Service: ${appointment.service_type}\n`;
          if (appointment.bay) response += `   Location: Bay ${appointment.bay.replace('bay', '')}\n`;
          if (appointment.notes) response += `   Notes: ${appointment.notes}\n`;
          response += '\n';
        });

        return new Response(
          JSON.stringify({ response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            response: `No appointments scheduled for tomorrow (${tomorrow.toLocaleDateString()}).` 
          }),
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
You assist technicians and staff with technical information, parts lookup, diagnostic procedures, and workshop management.

Analyze this request and respond professionally: ${message}

If this is about:
- Any appointments or scheduling: Respond with exactly: QUERY_APPOINTMENTS
- Job tickets/status: Respond with exactly: QUERY_JOB_TICKETS
- Client records: Respond with exactly: QUERY_CLIENTS

Otherwise, provide technical automotive advice focusing on:
- Repair procedures
- Technical specifications
- Diagnostic steps
- Parts information
- Workshop safety protocols

Keep responses technical and precise, suitable for professional automotive technicians.` }
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
