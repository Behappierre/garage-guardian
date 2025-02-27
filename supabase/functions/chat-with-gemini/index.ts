
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { format, addDays, startOfDay, endOfDay } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

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

    async function processMessage(message: string) {
      const lowerMessage = message.toLowerCase();
      
      // Check for appointment queries
      if (lowerMessage.includes('booking') || lowerMessage.includes('appointment')) {
        try {
          console.log('Processing appointment query');
          let startDate, endDate;
          
          // Parse the time frame from the message
          if (lowerMessage.includes('tomorrow')) {
            startDate = startOfDay(addDays(new Date(), 1));
            endDate = endOfDay(addDays(new Date(), 1));
          } else if (lowerMessage.includes('today')) {
            startDate = startOfDay(new Date());
            endDate = endOfDay(new Date());
          } else {
            startDate = startOfDay(new Date());
            endDate = endOfDay(addDays(new Date(), 7)); // Default to next 7 days
          }

          console.log('Querying appointments between:', startDate, 'and', endDate);
          
          const { data: appointments, error } = await supabaseClient
            .from('appointments')
            .select(`
              *,
              client:clients(
                first_name,
                last_name
              ),
              vehicle:vehicles(
                make,
                model,
                year,
                license_plate
              )
            `)
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString())
            .order('start_time', { ascending: true });

          if (error) {
            console.error('Appointment query error:', error);
            throw error;
          }

          if (!appointments || appointments.length === 0) {
            return `No appointments found for the specified time period.`;
          }

          // Format the appointments into a readable response
          const formattedAppointments = appointments.map(apt => {
            const clientName = apt.client ? `${apt.client.first_name} ${apt.client.last_name}` : 'No client name';
            const vehicleInfo = apt.vehicle ? 
              `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}${apt.vehicle.license_plate ? ` (${apt.vehicle.license_plate})` : ''}` : 
              'No vehicle info';
            
            return `• ${format(new Date(apt.start_time), 'h:mm a')} - ${clientName}\n  ${apt.service_type}\n  Vehicle: ${vehicleInfo}`;
          }).join('\n\n');

          const timeFrame = lowerMessage.includes('tomorrow') ? 'tomorrow' : 
                          lowerMessage.includes('today') ? 'today' : 
                          'the next 7 days';

          return `Here are the appointments for ${timeFrame}:\n\n${formattedAppointments}`;
        } catch (error) {
          console.error('Error processing appointment query:', error);
          return `Sorry, I couldn't retrieve the appointment information. Error: ${error.message}`;
        }
      }

      // License plate query
      const licensePlateMatch = message.match(/(?:whose|who owns|find|car).*\b([A-Z0-9]{3,7})\b/i);
      
      if (licensePlateMatch) {
        try {
          const licensePlate = licensePlateMatch[1].toUpperCase();
          console.log('Searching for license plate:', licensePlate);
          
          const { data: vehicle, error } = await supabaseClient
            .from('vehicles')
            .select(`
              id,
              make,
              model,
              year,
              license_plate,
              client:clients!inner(
                id,
                first_name,
                last_name,
                email,
                phone
              )
            `)
            .ilike('license_plate', licensePlate)
            .maybeSingle();

          console.log('Query result:', { vehicle, error });

          if (error) {
            console.error('Database error:', error);
            throw error;
          }
          
          if (!vehicle) {
            return `No vehicle found with license plate ${licensePlate}.`;
          }

          return `Vehicle Details:\n\n` +
                 `Make: ${vehicle.make}\n` +
                 `Model: ${vehicle.model}\n` +
                 `Year: ${vehicle.year}\n` +
                 `Owner: ${vehicle.client.first_name} ${vehicle.client.last_name}\n` +
                 `Contact: ${vehicle.client.phone || 'No phone'} / ${vehicle.client.email || 'No email'}`;
        } catch (error) {
          console.error('Vehicle query error:', error);
          return `Error fetching vehicle information. Details: ${error.message}`;
        }
      }

      // For non-specific queries, use OpenAI
      try {
        console.log('Using OpenAI for general query');
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant at an auto repair shop specializing in European vehicles. Answer questions about vehicles, maintenance, repairs, and automotive specifications."
            },
            {
              role: "user", 
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        console.log('OpenAI response:', completion.choices[0]);
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
