
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Chat memory for maintaining context
const chatMemory: Record<string, {
  lastAppointmentId?: string;
  lastClientId?: string;
  lastClientName?: string;
}> = {};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, user_id } = await req.json()
    console.log('Received message:', message, 'from user:', user_id)

    // Initialize chat memory for this user if needed
    if (!chatMemory[user_id]) {
      chatMemory[user_id] = {};
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    async function findClient(name: string) {
      console.log('Searching for client:', name)
      const names = name.toLowerCase().trim().split(' ')
      let query = supabaseClient
        .from('clients')
        .select('*, vehicles(*)')

      if (names.length >= 2) {
        query = query
          .or(`first_name.ilike.%${names[0]}%,last_name.ilike.%${names[1]}%`)
      } else {
        query = query.or(`first_name.ilike.%${names[0]}%,last_name.ilike.%${names[0]}%`)
      }

      const { data: clients, error } = await query

      if (error) {
        console.error('Error searching for client:', error)
        return null
      }

      return clients?.[0] || null
    }

    async function createAppointment(clientId: string, vehicleId: string, dateTime: Date, serviceType = 'General Service') {
      const endTime = new Date(dateTime.getTime() + (60 * 60 * 1000)) // 1 hour duration

      const { data: appointment, error } = await supabaseClient
        .from('appointments')
        .insert([{
          client_id: clientId,
          vehicle_id: vehicleId,
          start_time: dateTime.toISOString(),
          end_time: endTime.toISOString(),
          service_type: serviceType,
          status: 'scheduled',
          bay: 'bay1'
        }])
        .select('*, client:clients(*)')
        .single()

      if (error) {
        console.error('Error creating appointment:', error)
        throw error
      }

      // Update chat memory
      chatMemory[user_id].lastAppointmentId = appointment.id
      chatMemory[user_id].lastClientId = clientId
      chatMemory[user_id].lastClientName = appointment.client.first_name + ' ' + appointment.client.last_name

      console.log('Created appointment:', appointment)
      return appointment
    }

    async function updateAppointmentService(appointmentId: string, serviceType: string) {
      console.log('Updating appointment:', appointmentId, 'with service:', serviceType)

      const { data: appointment, error } = await supabaseClient
        .from('appointments')
        .update({ service_type: serviceType })
        .eq('id', appointmentId)
        .select('*, client:clients(*)')
        .single()

      if (error) {
        console.error('Error updating appointment:', error)
        throw error
      }

      console.log('Updated appointment:', appointment)
      return appointment
    }

    function parseDateAndTime(message: string): Date | null {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const timeMatch = message.match(/(\d{1,2})(?::(\d{2}))?\s*(pm|am)/i)
      if (!timeMatch) return null
      
      let hours = parseInt(timeMatch[1])
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const period = timeMatch[3].toLowerCase()
      
      if (period === 'pm' && hours !== 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
      
      const date = message.toLowerCase().includes('tomorrow') ? tomorrow : now
      date.setHours(hours, minutes, 0, 0)
      
      return date
    }

    async function processMessage(message: string) {
      const lowerMessage = message.toLowerCase()
      console.log('Processing message:', message)
      console.log('Current chat memory:', chatMemory[user_id])

      // Check for service update request
      if (lowerMessage.includes('add') && lowerMessage.includes('service') && 
          (lowerMessage.includes('booking') || lowerMessage.includes('appointment'))) {
        
        if (!chatMemory[user_id]?.lastAppointmentId) {
          return "I couldn't find a recent booking to update. Could you try making the booking request again?"
        }

        const serviceMatch = message.match(/add\s+([A-Za-z]+)\s+service/i)
        if (!serviceMatch) {
          return "Please specify what type of service you'd like to add."
        }

        const serviceType = `${serviceMatch[1]} Service`
        try {
          const updated = await updateAppointmentService(chatMemory[user_id].lastAppointmentId, serviceType)
          return `I've updated the service type to "${serviceType}" for ${chatMemory[user_id].lastClientName}'s appointment.`
        } catch (error) {
          console.error('Service update error:', error)
          return "I had trouble updating the service type. Please try again."
        }
      }

      // Process booking request
      const bookingMatch = message.match(/(?:book|appointment|booking)\s+(?:for|with)\s+([a-zA-Z ]+?)(?:\s+(?:at|on|tomorrow|for|,|\s)\s*(.*))?$/i)
      
      if (!bookingMatch) {
        return "I couldn't understand the booking request. Please use format: 'Book an appointment for [name]' or 'Book for [name] tomorrow at 1pm'"
      }

      const clientName = bookingMatch[1].trim()
      const timeInfo = bookingMatch[2]

      const client = await findClient(clientName)
      if (!client) {
        return `I couldn't find a client named "${clientName}" in our system.`
      }

      if (!timeInfo) {
        return `I found ${client.first_name} ${client.last_name}. When would you like to schedule the appointment?`
      }

      const appointmentTime = parseDateAndTime(timeInfo)
      if (!appointmentTime) {
        return "I couldn't understand the time format. Please specify a time like '1pm' or '2:30pm'."
      }

      if (!client.vehicles?.[0]) {
        return `${client.first_name} ${client.last_name} doesn't have any vehicles registered. Please add a vehicle first.`
      }

      try {
        await createAppointment(client.id, client.vehicles[0].id, appointmentTime)
        return `Perfect! I've booked an appointment for ${client.first_name} ${client.last_name} ${
          appointmentTime.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }. The booking is confirmed in the system.`
      } catch (error) {
        console.error('Booking error:', error)
        return "I encountered an error while creating the appointment. Please try again."
      }
    }

    const response = await processMessage(message)
    console.log('Sending response:', response)

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
