
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // First, let's fetch relevant client information
    let contextData = {};
    
    // Check for client name in the message
    const nameMatch = message.toLowerCase().match(/(?:booking for|client|customer|appointment for)\s+([a-z ]+)/);
    // Also check for vehicle details
    const vehicleMatch = message.toLowerCase().match(/(?:alfa|romeo|stelvio|olh878)/);
    
    // If we have a name match or vehicle details, search for the client
    if (nameMatch || vehicleMatch) {
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
              exactMatch: matchingClients.length === 1
            };
          }
        } else {
          contextData = {
            clients: clientData,
            matchCount: clientData.length
          };
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
   - Confirm client details found in the database
   - For exact matches, help process the booking
   - For multiple matches, ask for clarification
   - For no matches, suggest client registration

Correct response examples:
✅ "I've found Mr. Andre's record. His Alfa Romeo Stelvio (OLH878) is in the system. Shall I proceed with booking for tomorrow at 2 PM?"
✅ "There are multiple matches for this client. Would you like me to list them with their vehicle details?"
✅ "I can't find this client in the system. Would you like to register them as a new client?"

Incorrect responses:
❌ "Could you provide your vehicle details?"
❌ "When would you like to schedule your appointment?"
❌ "Thank you for contacting us"

Remember: You are ALWAYS speaking to the garage manager about their clients, never to the clients themselves.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ],
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
          timestamp: new Date().toISOString()
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
