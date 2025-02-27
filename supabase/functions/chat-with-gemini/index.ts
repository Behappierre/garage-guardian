
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

    // Process the incoming message
    async function processMessage(message: string) {
      const lowerMessage = message.toLowerCase();
      
      // Extract client name if present in the query
      const clientNameMatch = message.match(/([A-Z][a-z]+ [A-Z][a-z]+)'s bookings/);
      const isBookingQuery = lowerMessage.includes('booking') || 
                            lowerMessage.includes('appointment') || 
                            lowerMessage.includes('schedule') || 
                            lowerMessage.includes("today's");

      if (isBookingQuery) {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          let query = supabaseClient
            .from('appointments')
            .select(`
              *,
              client:clients(first_name, last_name),
              vehicle:vehicles(make, model)
            `)
            .gte('start_time', today.toISOString())
            .lt('start_time', tomorrow.toISOString())
            .order('start_time');

          // If a specific client was mentioned, filter for that client
          if (clientNameMatch) {
            const [firstName, lastName] = clientNameMatch[1].split(' ');
            query = query.eq('client.first_name', firstName)
                        .eq('client.last_name', lastName);
          }

          const { data: appointments, error } = await query;

          if (error) {
            console.error('Database error:', error);
            throw new Error('Failed to fetch appointments');
          }

          if (!appointments || appointments.length === 0) {
            return clientNameMatch 
              ? `No appointments found today for ${clientNameMatch[1]}.`
              : "There are no appointments scheduled for today.";
          }

          // Format appointments into readable text
          const appointmentsList = appointments.map(apt => {
            const time = new Date(apt.start_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            const clientName = apt.client ? `${apt.client.first_name} ${apt.client.last_name}` : 'No client name';
            const vehicle = apt.vehicle ? `${apt.vehicle.make} ${apt.vehicle.model}` : 'No vehicle details';
            
            return `${time}: ${clientName} - ${vehicle} (${apt.service_type || 'General Service'})`;
          });

          const headerText = clientNameMatch 
            ? `Appointments for ${clientNameMatch[1]}:`
            : "Today's appointments:";

          return `${headerText}\n\n${appointmentsList.join('\n')}`;
        } catch (error) {
          console.error('Error fetching appointments:', error);
          return "I apologize, but I encountered an error while fetching the appointments. Please try again or check with your system administrator.";
        }
      }

      // For non-booking queries, use OpenAI
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
