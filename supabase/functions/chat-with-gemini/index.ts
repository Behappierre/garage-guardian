
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format } from "https://deno.sh/x/date_fns@v2.22.1/format/index.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maintain conversation context
interface ConversationContext {
  lastFoundClients: any[];
  lastBookingDetails: any;
  lastSelectedClient?: any;
}

let context: ConversationContext = {
  lastFoundClients: [],
  lastBookingDetails: null
};

async function findVehicleOwner(supabase: any, licensePlate: string) {
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select(`
      license_plate,
      make,
      model,
      year,
      client:clients (
        id,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq('license_plate', licensePlate)
    .single();

  if (error || !vehicles?.client) {
    return {
      success: false,
      message: "I'm sorry, but I couldn't find information about that vehicle. Please make sure the license plate is correct."
    };
  }

  context.lastSelectedClient = vehicles.client;
  
  return {
    success: true,
    message: `That vehicle (${vehicles.year} ${vehicles.make} ${vehicles.model}) belongs to ${vehicles.client.first_name} ${vehicles.client.last_name}.`
  };
}

async function findClientVehicles(supabase: any, clientName: string) {
  const nameParts = clientName.toLowerCase().split(' ');
  
  const { data: clients, error } = await supabase
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
    .or(
      nameParts.map(part => 
        `or(first_name.ilike.%${part}%,last_name.ilike.%${part}%)`
      ).join(',')
    );

  if (error || !clients?.length) {
    return {
      success: false,
      message: "I'm sorry, but I couldn't find any vehicles registered to that name."
    };
  }

  if (clients.length === 1) {
    const client = clients[0];
    context.lastSelectedClient = client;
    
    if (!client.vehicles?.length) {
      return {
        success: false,
        message: `${client.first_name} ${client.last_name} doesn't have any vehicles registered in our system.`
      };
    }

    const vehiclesList = client.vehicles
      .map(v => `• ${v.year} ${v.make} ${v.model}${v.license_plate ? ` (${v.license_plate})` : ''}`)
      .join('\n');

    return {
      success: true,
      message: `${client.first_name} ${client.last_name}'s registered vehicles:\n${vehiclesList}`
    };
  }

  context.lastFoundClients = clients;
  const clientsList = clients
    .map(client => {
      const vehicles = client.vehicles
        ?.map(v => `• ${v.year} ${v.make} ${v.model}${v.license_plate ? ` (${v.license_plate})` : ''}`)
        .join('\n') || '• No vehicles registered';
      return `${client.first_name} ${client.last_name}:\n${vehicles}`;
    })
    .join('\n\n');

  return {
    success: false,
    message: `I found multiple clients with similar names. Please specify which one:\n\n${clientsList}`
  };
}

async function createBooking(supabase: any, clientInfo: string) {
  // Handle cases where the client is specified with their vehicle
  const match = clientInfo.match(/(.+?):\s*(.+)/);
  if (!match) return null;

  const [_, clientName, vehicleInfo] = match;
  const client = context.lastFoundClients.find(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase() === clientName.trim().toLowerCase()
  );

  if (!client) {
    return {
      success: false,
      message: "I couldn't find that client in the list. Please try again with one of the listed names."
    };
  }

  // Find the matching vehicle from the client's vehicles
  const vehicle = client.vehicles?.find(v => 
    vehicleInfo.includes(v.make) && 
    vehicleInfo.includes(v.model) &&
    vehicleInfo.includes(v.license_plate || '')
  );

  const appointment = {
    client_id: client.id,
    vehicle_id: vehicle?.id,
    service_type: context.lastBookingDetails?.service_type || 'general service',
    start_time: context.lastBookingDetails?.startTime.toISOString() || new Date().toISOString(),
    end_time: new Date(new Date(context.lastBookingDetails?.startTime || new Date()).getTime() + 60 * 60 * 1000).toISOString(),
    status: 'scheduled'
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();

  if (error) {
    console.error('Booking error:', error);
    return {
      success: false,
      message: "I'm sorry, but I couldn't create the booking. Please try again."
    };
  }

  // Clear context after successful booking
  context = { lastFoundClients: [], lastBookingDetails: null };

  const vehicleInfo = vehicle 
    ? `\nVehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`
    : '';

  return {
    success: true,
    message: `Perfect! I've created an appointment for ${client.first_name} ${client.last_name} at ${format(new Date(appointment.start_time), "MMM d 'at' h:mm a")} for ${appointment.service_type}.${vehicleInfo}`
  };
}

async function handleMessage(supabase: any, message: string) {
  const lowerMessage = message.toLowerCase();

  // Handle vehicle ownership queries
  if (lowerMessage.includes('whose car is')) {
    const plate = lowerMessage.match(/is\s+([a-z0-9]+)/i)?.[1];
    if (plate) {
      return await findVehicleOwner(supabase, plate);
    }
  }

  // Handle vehicle information queries
  if (lowerMessage.includes("'s car") || lowerMessage.includes('what car')) {
    const name = lowerMessage.match(/what (?:car|vehicle) (?:does )?(.+?) (?:have|drive|own)/i)?.[1] 
      || lowerMessage.match(/what is (.+?)'s car/i)?.[1];
    if (name) {
      return await findClientVehicles(supabase, name);
    }
  }

  // Handle booking creation/follow-up
  if (context.lastFoundClients.length > 0 && message.includes('•')) {
    return await createBooking(supabase, message);
  }

  // Parse new booking request
  if (lowerMessage.includes('booking') || lowerMessage.includes('appointment')) {
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

    context.lastBookingDetails = {
      startTime,
      client_name: nameMatch ? nameMatch[1].trim() : null,
      service_type: serviceMatch ? serviceMatch[1].trim() : 'general service'
    };

    return await findClientVehicles(supabase, context.lastBookingDetails.client_name);
  }

  return {
    success: false,
    message: "I'm sorry, I didn't understand that request. You can ask me about vehicle ownership, client vehicles, or making appointments."
  };
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

    const result = await handleMessage(supabase, message);
    
    return new Response(
      JSON.stringify({ response: result.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      }
    );

  } catch (error) {
    console.error('Error:', error);
    context = { lastFoundClients: [], lastBookingDetails: null }; // Reset context on error
    return new Response(
      JSON.stringify({ 
        response: "I'm sorry, but I encountered an error processing your request. Please try again." 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
