
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
    const nameMatch = message.toLowerCase().match(/(?:booking for|client|customer|appointment for)\s+([a-z ]+)/);
    
    if (nameMatch) {
      const searchName = nameMatch[1].trim();
      const { data: clientData, error: clientError } = await supabase
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
        .or(`first_name.ilike.%${searchName}%,last_name.ilike.%${searchName}%`)
        .order('created_at', { ascending: false });

      if (!clientError && clientData?.length > 0) {
        contextData = {
          clients: clientData,
          matchCount: clientData.length
        };
      }
    }

    // System message to guide AI responses
    const systemMessage = `You are an AI assistant helping a garage manager with their automotive service management system. 
    
Important guidelines:
1. Always speak TO THE GARAGE MANAGER about their clients, not to the clients directly
2. Use "the client" or "Mr./Mrs. [Last Name]" when referring to clients
3. When processing booking requests:
   - If client is found in database, confirm their details
   - If multiple matches found, ask the manager for clarification
   - If no match found, inform the manager that the client needs to be registered

Current context: ${JSON.stringify(contextData)}

Example responses:
✅ "I found Mr. Andre in the system. His Alfa Romeo Stelvio is due for service..."
✅ "I found multiple clients with that name. Could you confirm which client by their vehicle details?"
✅ "This client isn't in our system. Would you like to register them first?"

❌ Don't say: "Could you provide your vehicle details?" (Don't speak to the client)
❌ Don't say: "Thank you for contacting us" (Don't speak to the client)`;

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
