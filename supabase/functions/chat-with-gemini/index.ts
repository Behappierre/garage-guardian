
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format } from "https://deno.sh/x/date_fns@v2.22.1/format/index.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function findVehicleAndClient(supabase: any, make: string, model: string, licensePlate: string) {
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      client:clients (
        id,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq('license_plate', licensePlate)
    .eq('make', make)
    .eq('model', model)
    .single();

  if (error || !vehicle) {
    console.error('Error finding vehicle:', error);
    return null;
  }

  return vehicle;
}

async function createAppointment(supabase: any, clientId: string, vehicleId: string, serviceType: string) {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() + 1); // tomorrow
  startTime.setHours(14, 0, 0, 0); // 2 PM

  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      vehicle_id: vehicleId,
      service_type: serviceType,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'scheduled'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }

  return appointment;
}

async function handleDirectBooking(supabase: any, message: string) {
  // Parse booking request from message format: "Make a booking for {name}: • {year} {make} {model} ({plate})"
  const bookingMatch = message.match(/booking for ([^:]+):\s*•\s*(\d{4})\s+([^\s]+)\s+([^(]+)\s*\(([^)]+)\)/i);
  
  if (!bookingMatch) {
    console.log('No booking match found in message:', message);
    return null;
  }

  const [_, clientName, year, make, model, plate] = bookingMatch;
  console.log('Parsed booking details:', { clientName, year, make, model, plate });

  // Find the vehicle and associated client
  const vehicle = await findVehicleAndClient(supabase, make.trim(), model.trim(), plate.trim());
  
  if (!vehicle || !vehicle.client) {
    return {
      success: false,
      message: `I couldn't find a vehicle with license plate ${plate} registered to ${clientName}. Please verify the information and try again.`
    };
  }

  // Verify client name matches
  const fullName = `${vehicle.client.first_name} ${vehicle.client.last_name}`.toLowerCase();
  if (!fullName.includes(clientName.toLowerCase())) {
    return {
      success: false,
      message: `The vehicle with license plate ${plate} is not registered to ${clientName}. Please verify the information.`
    };
  }

  try {
    const appointment = await createAppointment(
      supabase,
      vehicle.client.id,
      vehicle.id,
      'maintenance service'
    );

    return {
      success: true,
      message: `Perfect! I've created an appointment for ${vehicle.client.first_name} ${vehicle.client.last_name} tomorrow at 2:00 PM.\n\nVehicle: ${year} ${make} ${model} (${plate})\nService: Maintenance service\n\nThe appointment has been confirmed and added to the schedule.`
    };
  } catch (error) {
    console.error('Failed to create appointment:', error);
    return {
      success: false,
      message: "I apologize, but I encountered an error while creating the appointment. Please try again or contact support."
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First try to handle direct booking
    if (message.toLowerCase().includes('make a booking')) {
      const result = await handleDirectBooking(supabase, message);
      if (result) {
        return new Response(
          JSON.stringify({ response: result.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: result.success ? 200 : 400
          }
        );
      }
    }

    // If not a direct booking or booking failed, provide instructions
    const response = `I'm sorry, I couldn't process that booking request automatically. Please provide the following details:

Name: Full name of the customer
Vehicle: Make, model, and year
License Plate: Vehicle registration number
Service Needed: Type of service required
Preferred Time: When you'd like to schedule the appointment

Once you provide these details, I can help create the appointment.`;

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        response: "I apologize, but I encountered an error while processing your request. Please try again." 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
