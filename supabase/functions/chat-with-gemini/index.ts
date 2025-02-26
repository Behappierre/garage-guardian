
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Conversation {
  clientId?: string;
  clientName?: string;
  appointmentTime?: Date;
  serviceType?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, user_id } = await req.json()
    console.log('Received message:', message)

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

      // If we have both first and last name
      if (names.length >= 2) {
        query = query
          .or(`first_name.ilike.%${names[0]}%,first_name.ilike.%${names[1]}%`)
          .or(`last_name.ilike.%${names[0]}%,last_name.ilike.%${names[1]}%`)
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

    async function createAppointment(clientId: string, vehicleId: string, dateTime: Date, serviceType: string = 'General Service') {
      const endTime = new Date(dateTime.getTime() + (60 * 60 * 1000))

      console.log('Creating appointment:', {
        clientId,
        vehicleId,
        startTime: dateTime,
        endTime,
        serviceType
      })

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
            bay: 'bay1',
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

    function parseDateAndTime(message: string): Date | null {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      // Extract time
      const timeMatch = message.match(/(\d{1,2})(?::(\d{2}))?\s*(pm|am)/i)
      if (!timeMatch) return null
      
      let hours = parseInt(timeMatch[1])
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const period = timeMatch[3].toLowerCase()
      
      if (period === 'pm' && hours !== 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
      
      // Use tomorrow's date if "tomorrow" is mentioned
      const date = message.toLowerCase().includes('tomorrow') ? tomorrow : now
      date.setHours(hours, minutes, 0, 0)
      
      return date
    }

    async function processBookingRequest(message: string) {
      console.log('Processing booking request:', message)
      
      // Look for both appointment and datetime information
      const bookingMatch = message.match(/(?:book|appointment|booking)\s+(?:for|with)\s+([a-zA-Z ]+?)(?:\s+(?:at|on|tomorrow|for|,|\s)\s*(.*))?$/i)
      
      if (!bookingMatch) {
        return "I couldn't understand the booking request. Please use format: 'Book an appointment for [name]' or 'Book for [name] tomorrow at 1pm'"
      }

      const clientName = bookingMatch[1].trim()
      const timeInfo = bookingMatch[2]
      console.log('Extracted client name:', clientName, 'Time info:', timeInfo)

      const client = await findClient(clientName)
      
      if (!client) {
        return `I couldn't find a client named "${clientName}" in our system. Please verify the name or create a new client record first.`
      }

      // If we have time information, try to create the appointment
      if (timeInfo) {
        const appointmentTime = parseDateAndTime(timeInfo)
        
        if (appointmentTime) {
          if (!client.vehicles || client.vehicles.length === 0) {
            return `I found ${client.first_name} ${client.last_name}, but they don't have any vehicles registered. Please add a vehicle first.`
          }

          try {
            const appointment = await createAppointment(
              client.id,
              client.vehicles[0].id,
              appointmentTime
            )

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
            console.error('Error creating appointment:', error)
            return "I apologize, but I encountered an error while creating the appointment. Please try again or contact support."
          }
        }
      }

      // If we found the client but need time information
      return `I found ${client.first_name} ${client.last_name} in our system. Please provide the preferred date and time for the appointment.`
    }

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
