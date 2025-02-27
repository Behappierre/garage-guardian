import OpenAI from 'openai';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS pre-flight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, user_id } = await req.json()

    if (!message) {
      throw new Error("No message provided")
    }

    // 1. Save message to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL or Key not provided")
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { 'Content-Type': 'application/json' },
      },
    });

    const { error: insertError } = await supabase
      .from('messages')
      .insert({ content: message, role: 'user', user_id: user_id });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw new Error(`Failed to save message to Supabase: ${insertError.message}`);
    }

    // 2. Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
      stream: false,
    });

    const response = completion.choices[0].message?.content;

    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // 3. Save response to Supabase
    const { error: insertResponseError } = await supabase
      .from('messages')
      .insert({ content: response, role: 'assistant', user_id: user_id });

    if (insertResponseError) {
      console.error('Supabase insert error:', insertResponseError);
      throw new Error(`Failed to save response to Supabase: ${insertResponseError.message}`);
    }

    // 4. Return response
    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from '@supabase/supabase-js'
