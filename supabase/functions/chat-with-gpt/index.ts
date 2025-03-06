
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { OpenAI } from "https://esm.sh/openai@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    console.log('Received message:', message);
    console.log('User ID:', user_id);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not set');
    }

    const supabase = createClient(supabaseUrl as string, supabaseKey as string);
    
    // Get the user's garage_id - this is a critical enhancement
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', user_id)
      .single();
      
    if (userError) {
      console.error("Error fetching user's garage_id:", userError);
      throw new Error("Unable to determine user's garage");
    }
    
    const userGarageId = userData?.garage_id;
    console.log('User garage ID:', userGarageId);
    
    if (!userGarageId) {
      console.warn("User doesn't have an assigned garage_id");
    }
    
    // Check for query intents
    const isQueryRequest = checkForQueryIntent(message);
    const isBookingRequest = checkForBookingIntent(message);
    
    // Handle appointment queries (show upcoming appointments)
    if (isQueryRequest) {
      console.log("Detected query intent, fetching appointment data");
      try {
        const queryResponse = await handleAppointmentQuery(message, supabase, userGarageId);
        if (queryResponse) {
          // Store the conversation
          await storeConversation(user_id, message, queryResponse, supabase);
          
          return new Response(
            JSON.stringify({ response: queryResponse }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (queryError) {
        console.error("Error handling query:", queryError);
        // Fall through to standard AI response
      }
    }
    
    // Handle booking requests
    if (isBookingRequest) {
      console.log("Detected booking intent, attempting to process booking");
      try {
        // Find client by name
        const nameMatch = message.match(/book(?:\s+in)?(?:\s+for)?\s+([A-Za-z\s]+)(?:\s+for)/i);
        let clientName = nameMatch ? nameMatch[1].trim() : null;
        
        // If no name found with the first regex, try another pattern
        if (!clientName) {
          const altNameMatch = message.match(/book(?:\s+in)?(?:\s+an\s+appointment\s+for)?\s+([A-Za-z\s]+)(?:\s+on|\s+next|\s+for)?/i);
          clientName = altNameMatch ? altNameMatch[1].trim() : null;
        }
        
        if (clientName) {
          console.log(`Looking for client with name: ${clientName}`);
          
          // Split the name and search for first/last name match
          const nameParts = clientName.split(' ');
          let firstName = nameParts[0];
          let lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          
          // Search for the client, now filtering by the user's garage_id
          const { data: clients, error: clientError } = await supabase
            .from('clients')
            .select('id, first_name, last_name, email')
            .eq('garage_id', userGarageId)
            .or(`first_name.ilike.${firstName}%,last_name.ilike.${lastName}%`);
            
          if (clientError) {
            console.error("Error fetching client:", clientError);
            throw new Error("Failed to find client information");
          }
          
          if (clients && clients.length > 0) {
            const client = clients[0];
            console.log(`Found client: ${client.first_name} ${client.last_name}`);
            
            // Try to extract date from message
            const dateInfo = extractDateFromMessage(message);
            if (!dateInfo.startTime) {
              throw new Error("Could not determine appointment date from message");
            }
            
            // Get the client's vehicles
            const { data: vehicles, error: vehicleError } = await supabase
              .from('vehicles')
              .select('id, make, model, year')
              .eq('client_id', client.id)
              .eq('garage_id', userGarageId);  // Add garage_id filter
              
            if (vehicleError) {
              console.error("Error fetching vehicles:", vehicleError);
              throw new Error("Failed to find vehicle information");
            }
            
            if (!vehicles || vehicles.length === 0) {
              throw new Error("No vehicles found for this client");
            }
            
            // Create the appointment
            const appointmentData = {
              client_id: client.id,
              vehicle_id: vehicles[0].id,
              start_time: dateInfo.startTime.toISOString(),
              end_time: dateInfo.endTime.toISOString(),
              service_type: extractServiceType(message) || "General Service",
              notes: `Booked via AI assistant: ${message}`,
              status: 'scheduled',
              bay: assignBay(dateInfo.startTime),
              garage_id: userGarageId  // Critical: Set the garage_id
            };
            
            console.log("Creating appointment with data:", appointmentData);
            
            const { data: appointment, error: appointmentError } = await supabase
              .from('appointments')
              .insert([appointmentData])
              .select()
              .single();
              
            if (appointmentError) {
              console.error("Error creating appointment:", appointmentError);
              throw new Error("Failed to create appointment");
            }
            
            const formattedDate = dateInfo.startTime.toLocaleString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            const response = `Booking is confirmed for ${client.first_name} ${client.last_name} on ${formattedDate}. The appointment has been added to the system. A ${vehicles[0].make} ${vehicles[0].model} has been linked to this booking.`;
            
            // Store the conversation
            await storeConversation(user_id, message, response, supabase);
            
            return new Response(
              JSON.stringify({ response }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            console.log("No matching client found");
          }
        }
      } catch (bookingError) {
        console.error("Error processing booking:", bookingError);
        // If booking processing fails, we'll fall back to OpenAI
      }
    }

    // If we reached here, either it's not a special request or processing failed
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: openAIApiKey,
    });

    // Get context information from database
    let context = `
      You are a helpful automotive service assistant for the garage management system.
      
      You can help with:
      1. Automotive questions and service inquiries
      2. Creating bookings for clients
      3. Providing information about upcoming appointments
      
      For bookings, tell users you can create bookings directly.
      For appointment queries, tell users you can check the schedule.
      
      IMPORTANT: NEVER say you don't have access to real-time data. You CAN access appointment data.
      If someone asks about appointments or bookings, you should ALWAYS try to provide real information.
    `;

    // Create a chat completion
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: context },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    console.log("OpenAI response:", response);
    
    // Store the conversation
    await storeConversation(user_id, message, response.choices[0].message.content, supabase);

    return new Response(
      JSON.stringify({ 
        response: response.choices[0].message.content 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request.',
        details: error.message
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

// Helper function for appointment queries
async function handleAppointmentQuery(message: string, supabase: any, garageId: string | null): Promise<string | null> {
  // Determine the time range for the query
  const timeRange = determineTimeRange(message);
  if (!timeRange) {
    return null;
  }
  
  try {
    // Query appointments in the specified time range - with garage_id filter added
    const query = supabase
      .from('appointments')
      .select(`
        *,
        client:clients(*),
        vehicle:vehicles(*)
      `)
      .gte('start_time', timeRange.startTime.toISOString())
      .lt('start_time', timeRange.endTime.toISOString())
      .order('start_time', { ascending: true });
      
    // Add garage filter if garage_id is available
    if (garageId) {
      query.eq('garage_id', garageId);
    } else {
      console.warn('No garage_id available for filtering appointments');
    }
    
    const { data: appointments, error: appointmentsError } = await query;
      
    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
      throw appointmentsError;
    }
    
    if (!appointments || appointments.length === 0) {
      return `No appointments found for ${timeRange.description}.`;
    }
    
    // Format the response
    let response = `Here are the appointments for ${timeRange.description}:\n\n`;
    
    appointments.forEach((appointment: any, index: number) => {
      const startTime = new Date(appointment.start_time);
      const formattedTime = startTime.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const client = appointment.client || { first_name: 'Unknown', last_name: 'Client' };
      const vehicle = appointment.vehicle || { make: 'Unknown', model: 'Vehicle' };
      
      response += `${index + 1}. ${formattedTime} - ${client.first_name} ${client.last_name}\n`;
      response += `   Service: ${appointment.service_type}\n`;
      response += `   Vehicle: ${vehicle.make} ${vehicle.model}\n`;
      response += `   Bay: ${appointment.bay || 'Not assigned'}\n`;
      response += `   Status: ${appointment.status}\n\n`;
    });
    
    return response;
    
  } catch (error) {
    console.error("Error in handleAppointmentQuery:", error);
    throw error;
  }
}

// Helper function to determine time range from query
function determineTimeRange(message: string): { startTime: Date, endTime: Date, description: string } | null {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const today = new Date(now);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  
  // Check for specific patterns
  if (/\btomorrow\b/i.test(message)) {
    const startTime = new Date(tomorrow);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(23, 59, 59, 999);
    
    return { 
      startTime, 
      endTime,
      description: `tomorrow (${startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })})`
    };
  }
  
  if (/\btoday\b/i.test(message)) {
    const startTime = new Date(today);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(today);
    endTime.setHours(23, 59, 59, 999);
    
    return { 
      startTime, 
      endTime,
      description: "today"
    };
  }
  
  if (/\bnext week\b/i.test(message)) {
    const startTime = new Date(tomorrow);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(nextWeek);
    endTime.setHours(23, 59, 59, 999);
    
    return { 
      startTime, 
      endTime,
      description: "next week"
    };
  }
  
  // Default to tomorrow if no specific timeframe is mentioned but query seems to be about appointments
  if (/\bappointments?\b|\bbookings?\b|\bschedule\b/i.test(message)) {
    const startTime = new Date(tomorrow);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(23, 59, 59, 999);
    
    return { 
      startTime, 
      endTime,
      description: `tomorrow (${startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })})`
    };
  }
  
  return null;
}

// Helper function to check if a message appears to be a booking request
function checkForBookingIntent(message: string): boolean {
  const bookingKeywords = [
    /book(?:\s+in)?/i,
    /schedul(?:e|ing)/i,
    /appoint(?:ment)?/i,
    /reserv(?:e|ation)/i,
    /slot/i
  ];
  
  return bookingKeywords.some(keyword => keyword.test(message));
}

// Helper function to check if a message appears to be a query about appointments
function checkForQueryIntent(message: string): boolean {
  // Check for querying patterns
  const queryPatterns = [
    /what\s+(?:are\s+the\s+)?(?:bookings|appointments)/i,
    /show\s+(?:me\s+)?(?:the\s+)?(?:bookings|appointments)/i,
    /list\s+(?:the\s+)?(?:bookings|appointments)/i,
    /(?:bookings|appointments)(?:\s+do\s+we\s+have)?(?:\s+for)?/i,
    /schedule(?:\s+for)?/i,
    /upcoming(?:\s+appointments)?/i
  ];
  
  return queryPatterns.some(pattern => pattern.test(message));
}

// Helper function to extract date information from a message
function extractDateFromMessage(message: string): { startTime: Date | null, endTime: Date | null } {
  const now = new Date();
  let startTime: Date | null = null;
  let endTime: Date | null = null;
  
  // Check for "next Monday", "next Tuesday", etc.
  const nextDayMatch = message.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (nextDayMatch) {
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      .indexOf(nextDayMatch[1].toLowerCase());
    
    startTime = new Date(now);
    const currentDay = startTime.getDay();
    const daysToAdd = (dayOfWeek + 7 - currentDay) % 7 || 7; // If today, go to next week
    
    startTime.setDate(startTime.getDate() + daysToAdd);
    startTime.setHours(9, 0, 0, 0); // Default to 9 AM
  }
  
  // Check for "tomorrow"
  if (!startTime && /tomorrow/i.test(message)) {
    startTime = new Date(now);
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(9, 0, 0, 0); // Default to 9 AM
  }
  
  // If no specific day was found, default to tomorrow
  if (!startTime) {
    startTime = new Date(now);
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(9, 0, 0, 0); // Default to 9 AM
  }
  
  // Set end time to 1 hour after start time
  if (startTime) {
    endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
  }
  
  return { startTime, endTime };
}

// Helper function to extract service type from a message
function extractServiceType(message: string): string | null {
  const serviceTypes = [
    { regex: /oil\s+change/i, type: "Oil Change" },
    { regex: /tir(?:e|es)/i, type: "Tire Service" },
    { regex: /brake/i, type: "Brake Service" },
    { regex: /diagnostic/i, type: "Diagnostics" },
    { regex: /mot/i, type: "MOT Test" },
    { regex: /service/i, type: "Full Service" },
    { regex: /repair/i, type: "Repair" },
    { regex: /maintenance/i, type: "Maintenance" }
  ];
  
  for (const service of serviceTypes) {
    if (service.regex.test(message)) {
      return service.type;
    }
  }
  
  return "General Service"; // Default
}

// Helper function to assign a bay based on service type and date
function assignBay(date: Date): string {
  // Simple round-robin assignment between bay1 and bay2
  const hour = date.getHours();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Use MOT bay for weekday mornings
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour < 12) {
    return "mot";
  }
  
  // Otherwise alternate between bay1 and bay2
  return date.getDate() % 2 === 0 ? "bay1" : "bay2";
}

// Helper function to store conversation in the database
async function storeConversation(userId: string, message: string, response: string, supabase: any) {
  try {
    const res = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        message,
        response,
        metadata: { source: "gpt-function" }
      });
      
    if (res.error) {
      console.error('Error storing chat message:', res.error);
    }
  } catch (error) {
    console.error('Error in storeConversation:', error);
  }
}
