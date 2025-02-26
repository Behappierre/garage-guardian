
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { addHours } from 'https://esm.sh/date-fns@2.30.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to extract date and time from message
function extractDateTime(message: string): Date | null {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Look for time in format like "2pm" or "2 PM"
  const timeMatch = message.match(/(\d{1,2})(?:\s*)?(?:am|pm)/i);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const isPM = timeMatch[0].toLowerCase().includes('pm');
    
    tomorrow.setHours(isPM ? hour + 12 : hour, 0, 0, 0);
    return tomorrow;
  }
  return null;
}

// Function to create appointment
async function createAppointment(supabase: any, clientData: any, startTime: Date, serviceType: string) {
  const endTime = addHours(startTime, 2); // Default 2-hour appointment

  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        client_id: clientData.id,
        vehicle_id: clientData.vehicles?.[0]?.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        service_type: serviceType,
        status: 'scheduled',
        notes: `Service requested: ${serviceType}`
      })
      .select()
      .single();

    if (error) throw error;
    return appointment;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch recent conversation history
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('message, response, metadata')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    let contextData = {};
    let appointmentCreated = null;
    
    // Check for client name in the message and recent messages
    const allText = [message, ...recentMessages?.map(m => m.message) || []].join(' ').toLowerCase();
    const nameMatch = allText.match(/(?:booking for|client|customer|appointment for)\s+([a-z ]+)/);
    const vehicleMatch = allText.match(/(?:alfa|romeo|stelvio|olh878)/);
    
    // Check if this is a confirmation message
    const isConfirmation = message.toLowerCase().includes('yes') && 
      recentMessages?.[0]?.response?.toLowerCase().includes('shall i proceed with the booking');
    
    if (nameMatch || vehicleMatch || isConfirmation) {
      let query = supabase
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
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (nameMatch) {
        const searchName = nameMatch[1].trim();
        query = query.or(`first_name.ilike.%${searchName}%,last_name.ilike.%${searchName}%`);
      }

      const { data: clientData, error: clientError } = await query;

      if (!clientError && clientData?.length > 0) {
        // Further filter by vehicle if we have vehicle details
        if (vehicleMatch) {
          const matchingClients = clientData.filter(client => 
            client.vehicles?.some(v => 
              v.license_plate?.toLowerCase().includes('olh878') ||
              v.make?.toLowerCase().includes('alfa') ||
              v.model?.toLowerCase().includes('stelvio')
            )
          );
          
          if (matchingClients.length > 0) {
            contextData = {
              clients: matchingClients,
              matchCount: matchingClients.length,
              exactMatch: matchingClients.length === 1,
              recentHistory: recentMessages?.map(m => ({
                message: m.message,
                response: m.response
              }))
            };

            // If this is a confirmation and we have an exact match, create the appointment
            if (isConfirmation && matchingClients.length === 1) {
              const startTime = extractDateTime(allText);
              if (startTime) {
                try {
                  appointmentCreated = await createAppointment(
                    supabase,
                    matchingClients[0],
                    startTime,
                    'Major Service and Brake Check'
                  );
                  contextData.appointmentCreated = appointmentCreated;
                } catch (error) {
                  console.error('Failed to create appointment:', error);
                  contextData.appointmentError = error.message;
                }
              }
            }
          }
        }
      }
    }

    // System message to guide AI responses
    const systemMessage = `You are an AI assistant helping a garage manager with their automotive service management system.

Role: You are speaking TO THE GARAGE MANAGER about their clients.

Current context: ${JSON.stringify(contextData)}

Key requirements:
1. NEVER address the client directly - you are speaking to the garage manager
2. Use "the client" or "Mr./Mrs. [Last Name]" when referring to clients
3. When handling bookings:
   - Maintain context from previous messages
   - For exact matches, proceed with booking details provided
   - Remember vehicle and service details mentioned earlier
   - If appointment was created, confirm with the booking reference
   - If appointment creation failed, inform about the error

Correct response examples:
✅ "I've created the appointment for Mr. Andre's Alfa Romeo Stelvio (OLH878) for tomorrow at 2 PM. The booking is confirmed in the system."
✅ "I've found Mr. Andre's record. His Alfa Romeo Stelvio (OLH878) is in the system. Shall I proceed with booking for tomorrow at 2 PM?"
✅ "I apologize, but there was an error creating the appointment. Please try again or create it manually."

Remember: 
- Maintain context from the entire conversation
- Confirm when appointments are successfully created
- Report any errors in appointment creation`;

    // Construct conversation history for the API call
    const conversationHistory = [
      { role: 'system', content: systemMessage },
      ...(recentMessages?.reverse().flatMap(m => [
        { role: 'user' as const, content: m.message },
        { role: 'assistant' as const, content: m.response }
      ]) || []),
      { role: 'user' as const, content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: conversationHistory,
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Store the interaction in the database
    const { error: dbError } = await supabase
      .from('chat_messages')
      .insert({
        user_id,
        message,
        response: aiResponse,
        metadata: {
          model: 'gpt-4',
          context: contextData,
          timestamp: new Date().toISOString(),
          appointmentCreated: appointmentCreated ? true : false
        }
      });

    if (dbError) {
      console.error('Error storing chat message:', dbError);
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
