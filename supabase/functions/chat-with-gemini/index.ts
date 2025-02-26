
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, user_id } = await req.json()
    console.log('Received message:', message)

    // Initialize Supabase client with service role key for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Function to search for a client
    async function findClient(name: string) {
      console.log('Searching for client:', name)
      const names = name.toLowerCase().trim().split(' ')
      let query = supabaseClient
        .from('clients')
        .select('*, vehicles(*)')

      // If we have both first and last name
      if (names.length >= 2) {
        query = query
          .ilike('first_name', `%${names[0]}%`)
          .ilike('last_name', `%${names[1]}%`)
      } else {
        // If we only have one name, search in both first and last name
        query = query.or(`first_name.ilike.%${names[0]}%,last_name.ilike.%${names[0]}%`)
      }

      const { data: clients, error } = await query

      if (error) {
        console.error('Error searching for client:', error)
        return null
      }

      console.log('Found clients:', clients)
      return clients && clients.length > 0 ? clients[0] : null
    }

    // Function to create an appointment
    async function createAppointment(clientId: string, vehicleId: string, dateTime: Date, serviceType: string = 'General Service') {
      // Calculate end time (1 hour after start time by default)
      const endTime = new Date(dateTime.getTime() + (60 * 60 * 1000))

      const { data: appointment, error } = await supabaseClient
        .from('appointments')
        .insert([
          {
            client_id: clientId,
            vehicle_id: vehicleId,
            start_time: dateTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'scheduled',
            service_type: serviceType,
            bay: 'bay1', // Default bay assignment
          }
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating appointment:', error)
        throw error
      }

      return appointment
    }

    // Process the message and extract appointment details
    async function processBookingRequest(message: string) {
      console.log('Processing booking request:', message)
      
      // Extract client name (looking for patterns like "book for [name]" or "appointment for [name]")
      const nameMatch = message.match(/(?:book|appointment|booking)\s+(?:for|with)\s+([a-zA-Z ]+?)(?:\s+(?:at|on|tomorrow|for)|$)/i)
      
      if (!nameMatch) {
        return "I couldn't find a client name in your request. Could you please rephrase with the client's name? For example: 'Book an appointment for John Smith'"
      }

      const clientName = nameMatch[1].trim()
      console.log('Extracted client name:', clientName)

      // Search for the client
      const client = await findClient(clientName)
      console.log('Found client:', client)

      if (!client) {
        return `I couldn't find a client named "${clientName}" in our system. Please verify the name or create a new client record first.`
      }

      // If we found the client, acknowledge it and proceed to next step
      return `I found ${client.first_name} ${client.last_name} in our system. To book an appointment, I'll need:
1. The preferred date and time
2. The type of service needed

Please provide these details.`
    }

    // Process the message
    const response = await processBookingRequest(message)

    return new Response(
      JSON.stringify({ response }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
