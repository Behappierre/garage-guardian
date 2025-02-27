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

    // Check if this might be a booking request
    const isBookingRequest = checkForBookingIntent(message);
    
    // If this seems like a booking request, try to handle it directly
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
          
          // Search for the client
          const { data: clients, error: clientError } = await supabase
            .from('clients')
            .select('id, first_name, last_name, email')
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
              .eq('client_id', client.id);
              
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
              bay: assignBay(dateInfo.startTime)
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
            
            return new Response(
              JSON.stringify({ 
                response: `Booking is confirmed for ${client.first_name} ${client.last_name} on ${formattedDate}. The appointment has been added to the system. A ${vehicles[0].make} ${vehicles[0].model} has been linked to this booking.` 
              }),
              { 
                headers: { 
                  ...corsHeaders,
                  'Content-Type': 'application/json' 
                } 
              }
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

    // If we reached here, either it's not a booking request or booking processing failed
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: openAIApiKey,
    });

    // Get context information from database
    let context = "You are a helpful automotive service assistant. ";
    context += `
    You can help with automotive questions and service inquiries.
    
    If users ask for bookings or appointments, tell them you can create bookings directly.
    Ask them for the client name, preferred date/time, and service type.
    
    For example, respond with: "I can schedule that for you. Would you like to book [client name] for [suggested date/time]?"
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

    // Store the conversation in the database
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          user_id,
          message,
          response: response.choices[0].message.content,
          metadata: { model: "gpt-4" }
        })
      });
      
      if (!res.ok) {
        console.error('Error storing chat message:', await res.text());
      }
    } catch (dbError) {
      console.error('Error storing chat in database:', dbError);
    }

    return new Response(
      JSON.stringify({ 
        response: response.choices[0].message.content 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
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
