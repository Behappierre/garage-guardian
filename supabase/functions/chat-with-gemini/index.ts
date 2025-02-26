
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

    // Initialize Supabase client with service role key for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Function to search for a client
    async function findClient(name: string) {
      const names = name.toLowerCase().split(' ')
      const { data: clients, error } = await supabaseClient
        .from('clients')
        .select('*, vehicles(*)')
        .filter('LOWER(first_name)', 'ilike', `%${names[0]}%`)
        .filter('LOWER(last_name)', 'ilike', `%${names[1] || ''}%`)

      if (error) {
        console.error('Error searching for client:', error)
        return null
      }

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
      
      // Extract client name (assuming format "booking for [name]")
      const nameMatch = message.toLowerCase().match(/for ([a-z ]+)(?: for|\bat\b|tomorrow)/i)
      if (!nameMatch) {
        return "I couldn't find a client name in your request. Could you please provide the client's full name?"
      }

      const clientName = nameMatch[1].trim()
      console.log('Extracted client name:', clientName)

      // Search for the client
      const client = await findClient(clientName)
      console.log('Found client:', client)

      if (!client) {
        return `I couldn't find a client named ${clientName} in our system. Please verify the name or create a new client record first.`
      }

      // If we don't have vehicle info, ask for it
      if (!client.vehicles || client.vehicles.length === 0) {
        return `I found ${client.first_name} ${client.last_name} in our system, but there are no vehicles registered. Please add a vehicle first.`
      }

      // Extract time (looking for specific time mentions or "tomorrow")
      const timeMatch = message.match(/(\d{1,2})(?::(\d{2}))?\s*(pm|am)/i)
      const includesTimeInfo = timeMatch || message.toLowerCase().includes('tomorrow')
      
      if (!timeMatch && !message.toLowerCase().includes('tomorrow')) {
        return "Could you please specify the time for the appointment?"
      }

      // Calculate appointment date/time
      let appointmentDate = new Date()
      if (message.toLowerCase().includes('tomorrow')) {
        appointmentDate.setDate(appointmentDate.getDate() + 1)
      }

      if (timeMatch) {
        let hours = parseInt(timeMatch[1])
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
        const period = timeMatch[3].toLowerCase()

        if (period === 'pm' && hours !== 12) hours += 12
        if (period === 'am' && hours === 12) hours = 0

        appointmentDate.setHours(hours, minutes, 0, 0)
      } else {
        // Default to 9 AM if no specific time given
        appointmentDate.setHours(9, 0, 0, 0)
      }

      console.log('Appointment date/time:', appointmentDate)

      try {
        // Create the appointment
        const appointment = await createAppointment(
          client.id,
          client.vehicles[0].id,
          appointmentDate
        )
        console.log('Created appointment:', appointment)

        return `Great, I've created the appointment for ${client.first_name} ${client.last_name}'s ${client.vehicles[0].make} ${client.vehicles[0].model} for ${appointmentDate.toLocaleString()}. The booking is confirmed in the system.`
      } catch (error) {
        console.error('Error during appointment creation:', error)
        return "I apologize, but I encountered an error while creating the appointment. Please try again or contact support."
      }
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
