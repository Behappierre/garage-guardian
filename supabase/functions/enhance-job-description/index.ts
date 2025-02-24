
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
1. Expanding any abbreviations or technical terms into clear explanations
2. Adding relevant diagnostic steps that should be checked
3. Including any safety considerations for the repair
4. Suggesting potential related issues to inspect
5. If a vehicle is provided, including any model-specific considerations or known issues

Format the response as:
- First paragraph: Enhanced, professional description of the issue using proper automotive terminology that's still understandable to customers
- Second paragraph: "Diagnostic Steps:" with a numbered list of recommended checks and tests
- Third paragraph: "Safety Considerations:" highlighting any relevant safety precautions
- Fourth paragraph: "Suggested Parts:" with a numbered list (only include parts with verified part numbers, exclude if uncertain)
- Final paragraph: "Additional Notes:" including model-specific information and related systems to inspect

Keep the response professional and thorough while maintaining clarity for both technicians and customers.`
          },
          {
            role: 'user',
            content: `Please analyze this job ticket description${vehicle ? ` for a ${vehicle}` : ''}: ${description}`
          }
        ],
        temperature: 0.7,
        max_tokens: 750
      }),
    });

    const data = await response.json();
    console.log('OpenAI Response:', data);
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
