
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are GarageWizz AI Assistant, an expert in auto repair shop management. You help users with:

1. Appointments: Scheduling, tracking, and managing service appointments
2. Clients: Managing customer information and vehicle records
3. Job Tickets: Creating and tracking repair jobs and service requests
4. Vehicle Management: Recording and accessing vehicle service history
5. Time Tracking: Managing technician time entries and work progress

You understand these database tables and their relationships:
- clients: Customer information (first_name, last_name, email, phone, address)
- vehicles: Vehicle records (make, model, year, VIN, license_plate) linked to clients
- appointments: Service appointments with time slots and service types
- job_tickets: Repair jobs with descriptions, status, and assigned technicians
- service_history: Past services performed on vehicles
- time_entries: Technician work time tracking

Please provide helpful, specific answers about using the GarageWizz system. Keep responses concise and relevant to auto repair shop management.

User Question: `;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      throw new Error('API key configuration error');
    }

    const { message } = await req.json();
    if (!message) {
      throw new Error('No message provided');
    }

    console.log('Sending request to Gemini API with message:', message);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt + message
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error Response:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API Raw Response:', JSON.stringify(data, null, 2));

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini API response structure:', data);
      throw new Error('Invalid response from Gemini API');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
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
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
