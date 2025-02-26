
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format } from "https://deno.sh/x/date_fns@v2.22.1/format/index.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store conversation context
let lastFoundClients: any[] = [];
let lastBookingDetails: any = null;

async function handleClientSelection(supabase: any, message: string) {
  if (!lastFoundClients.length || !lastBookingDetails) return null;

  // Handle "the second one" type responses
  const lowerMessage = message.toLowerCase();
  let selectedClient;

  if (lowerMessage.includes('second')) {
    selectedClient = lastFoundClients[1];
  } else if (lowerMessage.includes('first')) {
    selectedClient = lastFoundClients[0];
  } else {
    // Try to match by name
    const clientName = message.replace(/,.*$/, '').trim().toLowerCase();
    selectedClient = lastFoundClients.find(c => 
      `${c.first_name} ${c.last_name}`.toLowerCase() === clientName
    );
  }

  if (!selectedClient) return null;

  console.log('Selected client:', selectedClient);
  
  // Create the appointment using the stored booking details
  const startTime = lastBookingDetails.startTime;
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      client_id: selectedClient.id,
      vehicle_id: selectedClient.vehicles?.[0]?.id,
      service_type: lastBookingDetails.service_type,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'scheduled'
    })
    .select()
    .single();

  if (appointmentError) {
    console.error('Failed to create appointment:', appointmentError);
    return {
      success: false,
      message: "Sorry, I couldn't create the appointment due to a technical error."
    };
  }

  const vehicle = selectedClient.vehicles?.[0];
  const vehicleInfo = vehicle 
    ? `\nVehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.license_plate ? ` (${vehicle.license_plate})` : ''}`
    : '';

  // Clear the context after successful booking
  lastFoundClients = [];
  lastBookingDetails = null;

  return {
    success: true,
    message: `Perfect! I've created an appointment for ${selectedClient.first_name} ${selectedClient.last_name} on ${format(startTime, "MMM d 'at' h:mm a")} for ${lastBookingDetails.service_type}.${vehicleInfo}`
  };
}

async function parseBookingRequest(message: string) {
  const timeMatch = message.match(/(\d{1,2})(?::\d{2})?\s*(?:am|pm)?/i);
  const dateMatch = message.match(/(?:today|tomorrow|[\w]+day)/i);
  const nameMatch = message.match(/for\s+([^,]+?)(?:\s+for\s+|\s*$)/i);
  const serviceMatch = message.match(/for\s+(?:an?\s+)?([^,]+?)(?:\s*$|\s+(?:at|on|tomorrow|today))/i);

  let startTime = new Date();
  startTime.setHours(14, 0, 0, 0); // Default to 2 PM

  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    startTime.setHours(hour);
  }

  if (dateMatch && dateMatch[0].toLowerCase() === 'tomorrow') {
    startTime.setDate(startTime.getDate() + 1);
  }

  return {
    startTime,
    client_name: nameMatch ? nameMatch[1].trim() : null,
    service_type: serviceMatch ? serviceMatch[1].trim() : 'oil change'
  };
}

async function attemptBookingCreation(supabase: any, message: string) {
  try {
    // Check if this is a follow-up response
    if (lastFoundClients.length) {
      const result = await handleClientSelection(supabase, message);
      if (result) return result;
    }

    // Parse the initial booking request
    const bookingDetails = await parseBookingRequest(message);
    console.log('Parsed booking details:', bookingDetails);

    if (!bookingDetails.client_name) {
      return {
        success: false,
        message: "I couldn't determine who the appointment is for. Could you please provide a name?"
      };
    }

    // Search for matching clients
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        first_name,
        last_name,
        vehicles (
          id,
          make,
          model,
          year,
          license_plate
        )
      `)
      .or(`first_name.ilike.%${bookingDetails.client_name}%,last_name.ilike.%${bookingDetails.client_name}%`);

    if (clientError) {
      console.error('Error searching for client:', clientError);
      return {
        success: false,
        message: "Sorry, I encountered an error while searching for the client."
      };
    }

    if (!clients?.length) {
      return {
        success: false,
        message: `I couldn't find a client named "${bookingDetails.client_name}". Please check the name or create the client first.`
      };
    }

    if (clients.length > 1) {
      // Store the context for follow-up
      lastFoundClients = clients;
      lastBookingDetails = bookingDetails;

      // Format client list with vehicles
      const clientList = clients.map((client, index) => {
        const vehicles = client.vehicles?.map(v => 
          `• ${v.year} ${v.make} ${v.model}${v.license_plate ? ` (${v.license_plate})` : ''}`
        ).join('\n') || '• No vehicles registered';
        
        return `${client.first_name} ${client.last_name}:\n${vehicles}`;
      }).join('\n\n');

      return {
        success: false,
        message: `I found multiple clients with similar names. Please specify which one:\n\n${clientList}`
      };
    }

    // Single client found - proceed with booking
    const client = clients[0];
    lastFoundClients = [];
    lastBookingDetails = null;

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        client_id: client.id,
        vehicle_id: client.vehicles?.[0]?.id,
        service_type: bookingDetails.service_type,
        start_time: bookingDetails.startTime.toISOString(),
        end_time: new Date(bookingDetails.startTime.getTime() + 60 * 60 * 1000).toISOString(),
        status: 'scheduled'
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Failed to create appointment:', appointmentError);
      return {
        success: false,
        message: "Sorry, I couldn't create the appointment due to a technical error."
      };
    }

    const vehicle = client.vehicles?.[0];
    const vehicleInfo = vehicle 
      ? `\nVehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.license_plate ? ` (${vehicle.license_plate})` : ''}`
      : '';

    return {
      success: true,
      message: `Great! I've created an appointment for ${client.first_name} ${client.last_name} on ${format(bookingDetails.startTime, "MMM d 'at' h:mm a")} for ${bookingDetails.service_type}.${vehicleInfo}`
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const result = await attemptBookingCreation(supabase, message);
    if (result) {
      return new Response(JSON.stringify({ response: result.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      });
    }

    return new Response(
      JSON.stringify({ 
        response: "I'm sorry, I couldn't process that request. Could you please try rephrasing it?" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ response: "Sorry, I encountered an error processing your request." }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
