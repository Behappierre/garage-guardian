
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { OpenAI } from "https://esm.sh/openai@4.0.0";

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

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: openAIApiKey,
    });

    // Get context information from database
    let context = "You are a helpful automotive service assistant. ";
    try {
      // For this simple example, we'll just append some context
      context += "You can help with automotive questions, service inquiries, and bookings.";
    } catch (error) {
      console.warn("Error fetching context, continuing with basic context:", error);
    }

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
