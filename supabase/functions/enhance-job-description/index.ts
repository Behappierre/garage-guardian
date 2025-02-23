
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, vehicle } = await req.json();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert automotive technician and service writer. Your task is to enhance the job ticket description by:
1. Expanding any abbreviations or technical terms
2. Adding relevant diagnostic steps that should be checked
3. Including any safety considerations
4. Suggesting potential related issues to inspect
5. If a vehicle is provided, include any model-specific considerations

Format the response as a professional service description. Keep it concise but thorough, focusing on technical accuracy and completeness.
Use proper automotive terminology but ensure it's understandable to customers.`
          },
          {
            role: 'user',
            content: `Please enhance this job ticket description${vehicle ? ` for a ${vehicle}` : ''}: ${description}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    const data = await response.json();
    console.log('OpenAI Response:', data); // Log the response for debugging
    const enhancedDescription = data.choices[0].message.content;

    return new Response(JSON.stringify({ enhancedDescription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in enhance-job-description function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
