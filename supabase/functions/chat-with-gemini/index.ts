import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import OpenAI from 'https://esm.sh/openai@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Chat memory for storing context
const chatMemory: Record<string, {
  lastAppointmentId?: string
  lastClientId?: string
  lastClientName?: string
  lastVehicleId?: string
  lastRegistration?: string
  lastConversationContext?: string
}> = {}

// Common vehicle data for general inquiries
const vehicleData = {
  'fiat 500 1.2': {
    oilCapacity: '2.8 liters',
    tirePressure: '2.2 bar (32 psi) front, 2.1 bar (30 psi) rear',
    batteryType: '12V 50Ah (Group 47)',
    serviceInterval: '15,000 miles or 12 months',
  },
  'ford focus 1.0': {
    oilCapacity: '4.1 liters',
    tirePressure: '2.3 bar (33 psi) front, 2.2 bar (32 psi) rear',
    batteryType: '12V 60Ah (Group 48)',
    serviceInterval: '10,000 miles or 12 months',
  },
  'toyota corolla 1.8': {
    oilCapacity: '4.4 liters',
    tirePressure: '2.4 bar (35 psi) all around',
    batteryType: '12V 45Ah (Group 51R)',
    serviceInterval: '10,000 miles or 12 months',
  },
}

// Safety protocols and procedures
const safetyProtocols = {
  'jumpstart': 'When jumpstarting a vehicle: 1) Connect positive to positive (red to red), 2) Connect negative to engine block of dead car (not directly to battery), 3) Start donor vehicle, 4) Start receiving vehicle, 5) Disconnect in reverse order.',
  'tire change': 'To safely change a tire: 1) Park on level ground, 2) Apply parking brake, 3) Place wheel chocks, 4) Loosen lug nuts before jacking, 5) Place jack under manufacturer-recommended lifting points, 6) Raise vehicle until tire clears ground, 7) Remove lug nuts and tire, 8) Install spare tire, 9) Hand-tighten lug nuts, 10) Lower vehicle, 11) Torque lug nuts to spec in star pattern.',
  'brake fluid': 'When handling brake fluid: 1) Always wear gloves, 2) Avoid spilling on painted surfaces, 3) Keep container sealed, 4) Dispose of old fluid properly, 5) Never mix different types of brake fluid.',
  'oil change': 'For safe oil changes: 1) Ensure engine is warm but not hot, 2) Place an oil catch pan, 3) Remove fill cap before drain plug, 4) Dispose of used oil at recycling center, 5) Replace filter, 6) Refill with manufacturer-recommended oil grade and quantity.',
  'battery change': 'Safety procedure for changing a car battery: 1) Wear gloves and eye protection, 2) Turn off all electronics, 3) Disconnect negative (-) terminal first, 4) Disconnect positive (+), 5) Remove battery hold-down, 6) Carefully lift out old battery, 7) Clean terminals, 8) Install new battery, 9) Connect positive first, then negative, 10) Recycle old battery.',
  'changing a battery': 'To safely change a car battery: 1) Wear protective gloves and eye protection, 2) Turn off electronics, 3) Identify terminals, 4) Disconnect negative first, 5) Disconnect positive, 6) Remove battery hold-down, 7) Remove old battery, 8) Clean tray, 9) Install new battery, 10) Connect positive first, then negative, 11) Recycle old battery.',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, user_id } = await req.json()
    console.log('Received message:', message, 'from user:', user_id)

    // Initialize chat memory for this user if not existing
    if (!chatMemory[user_id]) {
      chatMemory[user_id] = {}
    }

    // Create Supabase and OpenAI clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? ''
    })

    // Process the incoming message
    async function processMessage(message: string) {
      const queryType = determineQueryType(message)
      chatMemory[user_id].lastConversationContext = queryType
      console.log('Query type detected:', queryType)

      try {
        switch (queryType) {
          case 'booking':
            return await handleBookingQuery(message)
          case 'client_management':
            return await handleClientManagement(message)
          case 'client_lookup':
            return await handleClientLookup(message)
          case 'vehicle_lookup':
            return await handleVehicleLookup(message)
          case 'job_sheet':
            return await handleJobSheetQuery(message)
          case 'car_specific':
            return await handleCarSpecificQuestion(message)
          case 'safety_protocol':
            return await handleSafetyProtocol(message)
          case 'general_automotive':
            return await handleGeneralAutomotiveQuestion(message)
          case 'non_automotive':
            return await handleNonAutomotiveQuestion(message)
          default:
            // Fallback
            return await handleGeneralAutomotiveQuestion(message)
        }
      } catch (error) {
        console.error('Error processing message:', error)
        return `I encountered an error while processing your request: ${error.message}. Please try again or rephrase your question.`
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    //  QUERY TYPE CLASSIFICATION
    // ─────────────────────────────────────────────────────────────────────────────
    function determineQueryType(msg: string): string {
      const lowerMessage = msg.toLowerCase()

      // Client management (add client/vehicle)
      const clientManagementKeywords = ['add client', 'new client', 'create client', 'add vehicle', 'new vehicle', 'register vehicle']
      if (clientManagementKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'client_management'
      }

      // Booking-related
      const bookingKeywords = ['book', 'appointment', 'booking', 'schedule', 'reserve', 'cancel', 'reschedule']
      if (bookingKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'booking'
      }

      // Client lookup
      const clientLookupKeywords = ['client', 'customer', 'phone', 'email', 'address', 'contact', 'who is', 'find client']
      if (clientLookupKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'client_lookup'
      }

      // Vehicle registration pattern or context
      const regContextWords = ['registration', 'reg', 'plate', 'car with', 'whose car']
      if (regContextWords.some(word => lowerMessage.includes(word))) {
        return 'vehicle_lookup'
      }

      // Vehicle lookup by other keywords
      const vehicleLookupKeywords = ['whose car', 'vehicle info', 'car details', 'find vehicle']
      if (vehicleLookupKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'vehicle_lookup'
      }

      // Job sheet or repairs
      const jobSheetKeywords = ['job sheet', 'repair', 'service history', 'maintenance', 'fixed', 'completed', 'work done']
      if (jobSheetKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'job_sheet'
      }

      // Safety protocol
      const safetyKeywords = ['safety', 'procedure', 'protocol', 'how to', 'steps', 'guide', 'change a', 'changing a', 'replace a', 'replacing a']
      if (safetyKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'safety_protocol'
      }

      // Car-specific questions
      const carSpecificKeywords = ['how many', 'what type', 'how much', 'how often', 'car', 'vehicle']
      const automotiveKeywords = ['engine', 'motor', 'transmission', 'brakes', 'tires', 'wheels', 'oil', 'fuel', 'battery']
      if (
        carSpecificKeywords.some(keyword => lowerMessage.includes(keyword)) ||
        automotiveKeywords.some(keyword => lowerMessage.includes(keyword))
      ) {
        return 'car_specific'
      }

      // Non-automotive
      const nonAutoKeywords = ['weather', 'news', 'sports', 'movie', 'music', 'food', 'recipe', 'travel', 'holiday', 'joke']
      if (nonAutoKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'non_automotive'
      }

      // Default to general automotive
      return 'general_automotive'
    }

    // ─────────────────────────────────────────────────────────────────────────────
    //  HANDLERS
    // ─────────────────────────────────────────────────────────────────────────────

    // BOOKING HANDLER
    async function handleBookingQuery(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase()

      // Cancel appointment
      if (lowerMessage.includes('cancel') && lowerMessage.includes('appointment')) {
        // If we have an appointment in memory, cancel that
        if (chatMemory[user_id].lastAppointmentId) {
          try {
            await cancelAppointment(chatMemory[user_id].lastAppointmentId)
            return `I've cancelled the appointment for ${chatMemory[user_id].lastClientName}.`
          } catch (error) {
            console.error('Cancellation error:', error)
            return "I had trouble cancelling the appointment. Please try again."
          }
        } else {
          // Attempt to extract client name
          const clientMatch = message.match(/(?:cancel|appointment)(?:.*)(?:for|of)\s+([a-zA-Z ]+)/i)
          if (!clientMatch) {
            return "I need a client name to cancel an appointment. Please specify whose appointment to cancel."
          }
          const clientName = clientMatch[1].trim()
          const client = await findClient(clientName)
          if (!client) {
            return `I couldn't find a client named "${clientName}" in our system.`
          }
          // Find the client’s active appointment
          const { data: appointment, error } = await supabaseClient
            .from('appointments')
            .select('id')
            .eq('client_id', client.id)
            .eq('status', 'scheduled')
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .single()

          if (error || !appointment) {
            return `I couldn't find any active appointments for ${client.first_name} ${client.last_name}.`
          }

          try {
            await cancelAppointment(appointment.id)
            return `I've cancelled the appointment for ${client.first_name} ${client.last_name}.`
          } catch (error) {
            console.error('Cancellation error:', error)
            return "I had trouble cancelling the appointment. Please try again."
          }
        }
      }

      // Appointment service update
      if ((lowerMessage.includes('add') || lowerMessage.includes('change')) &&
          lowerMessage.includes('service') &&
          (lowerMessage.includes('booking') || lowerMessage.includes('appointment'))) {
        if (!chatMemory[user_id]?.lastAppointmentId) {
          return "I couldn't find a recent booking to update. Could you try making the booking request again?"
        }
        const serviceMatch = message.match(/(?:add|change)(?:.*)(to|with)?\s+([A-Za-z]+)\s+service/i)
        if (!serviceMatch) {
          return "Please specify what type of service you'd like to add."
        }
        const serviceType = `${serviceMatch[2]} Service`
        try {
          await updateAppointmentService(chatMemory[user_id].lastAppointmentId!, serviceType)
          return `I've updated the service type to "${serviceType}" for ${chatMemory[user_id].lastClientName}'s appointment.`
        } catch (error) {
          console.error('Service update error:', error)
          return "I had trouble updating the service type. Please try again."
        }
      }

      // New booking
      const bookingMatch = message.match(
        /(?:book|appointment|booking)\s+(?:for|with)\s+([a-zA-Z ]+?)(?:\s+(?:at|on|tomorrow|for|,|\s)\s*(.*))?$/i
      )
      if (!bookingMatch) {
        return "I couldn't understand the booking request. Try: 'Book an appointment for [name] tomorrow at 1pm'"
      }

      const clientName = bookingMatch[1].trim()
      const timeInfo = bookingMatch[2]

      const client = await findClient(clientName)
      if (!client) {
        return `I couldn't find a client named "${clientName}" in our system.`
      }

      chatMemory[user_id].lastClientId = client.id
      chatMemory[user_id].lastClientName = `${client.first_name} ${client.last_name}`

      if (!timeInfo) {
        return `I found ${client.first_name} ${client.last_name}. When would you like to schedule the appointment?`
      }

      const appointmentTime = parseDateAndTime(timeInfo)
      if (!appointmentTime) {
        return "I couldn't understand the time format. Please specify a time like '1pm' or '2:30pm'."
      }

      if (!client.vehicles || client.vehicles.length === 0) {
        return `${client.first_name} ${client.last_name} doesn't have any vehicles registered. Please add a vehicle first.`
      }

      // If multiple vehicles, pick the first or prompt
      if (client.vehicles.length > 1) {
        console.log(`Client has multiple vehicles; picking the first by default.`)
      }
      chatMemory[user_id].lastVehicleId = client.vehicles[0].id

      try {
        await createAppointment(client.id, chatMemory[user_id].lastVehicleId!, appointmentTime)
        return `I've booked an appointment for ${client.first_name} ${client.last_name} on ${
          appointmentTime.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }.`
      } catch (error) {
        console.error('Booking error:', error)
        return "I encountered an error while creating the appointment. Please try again."
      }
    }

    // CLIENT MANAGEMENT
    async function handleClientManagement(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase()

      // Add new client
      if (lowerMessage.includes('add client') || lowerMessage.includes('new client') || lowerMessage.includes('create client')) {
        const match = message.match(/(?:add|new|create)\s+client\s+([a-zA-Z]+)\s+([a-zA-Z]+)/)
        if (!match) {
          return "To add a client, please provide at least first and last name, e.g. 'Add client John Smith'."
        }
        const firstName = match[1]
        const lastName = match[2]
        try {
          const data = await addNewClient(firstName, lastName)
          return `New client added with ID: ${data.id}.`
        } catch (error) {
          console.error('Add client error:', error)
          return "I couldn't add the client. Please try again."
        }
      }

      // Add new vehicle
      if (lowerMessage.includes('add vehicle') || lowerMessage.includes('new vehicle') || lowerMessage.includes('register vehicle')) {
        const match = message.match(
          /(?:add|new|register)\s+vehicle\s+(?:for\s+([a-zA-Z ]+))?\s*(make\s+([a-zA-Z]+))?.*(model\s+([a-zA-Z0-9]+))?.*(registration\s+([a-zA-Z0-9]+))?/i
        )
        if (!match) {
          return "To add a vehicle, please specify the client and basic vehicle info. For example: 'Add vehicle for John Smith make Ford model Focus registration ABC123'."
        }

        const clientName = match[1]?.trim()
        if (!clientName) {
          return "Please specify the client's name. E.g., 'Add vehicle for John Smith make Ford model Focus registration ABC123'."
        }

        const client = await findClient(clientName)
        if (!client) {
          return `I couldn't find a client named "${clientName}" in our system.`
        }

        const make = match[3] || 'Unknown'
        const model = match[5] || 'Unknown'
        const registration = match[7] || ''
        if (!registration) {
          return "Please provide a registration number. E.g., 'registration ABC123'."
        }

        try {
          const data = await addVehicle(client.id, make, model, registration)
          return `New vehicle added with ID: ${data.id} for ${client.first_name} ${client.last_name}.`
        } catch (error) {
          console.error('Add vehicle error:', error)
          return "I couldn't add the vehicle. Please try again."
        }
      }

      return "I didn't recognize a client management request. You can say 'Add client [first] [last]' or 'Add vehicle for [name]'."
    }

    // CLIENT LOOKUP
    async function handleClientLookup(message: string): Promise<string> {
      // Extract the portion after "client" or "customer"
      const match = message.match(/(?:client|customer)\s+(.*)/i)
      if (!match) {
        return "Please specify which client or customer you're looking for."
      }

      // Remove punctuation and common filler words at the end (like 'what', 'vehicle', etc.)
      let rawSearch = match[1].replace(/[^\w\s]/g, '').trim() // strip punctuation
      // If user says "client Olivier Andre what is his vehicle", we want to trim off "what is his vehicle"
      const fillerWords = ['what','is','his','her','vehicle','car','and','the','their','with','which','client','customer']
      let parts = rawSearch.split(/\s+/)
      // If we have more than 2 parts, try removing trailing filler words
      while (parts.length > 2 && fillerWords.includes(parts[parts.length - 1].toLowerCase())) {
        parts.pop()
      }
      rawSearch = parts.join(' ')

      if (!rawSearch) {
        return "I couldn't parse a valid client name from your request."
      }

      const client = await findClient(rawSearch)
      if (!client) {
        return `No client found matching "${rawSearch}".`
      }

      // Summarize client info
      const vehiclesList = client.vehicles?.map(
        (v: any) => `${v.make} ${v.model} (${v.registration})`
      ).join(', ') || 'No vehicles'

      return `Client found: ${client.first_name} ${client.last_name}, Phone: ${client.phone ?? 'N/A'}, Email: ${client.email ?? 'N/A'}, Vehicles: ${vehiclesList}.`
    }

    // VEHICLE LOOKUP (IMPROVED REGEX)
    async function handleVehicleLookup(message: string): Promise<string> {
      // Find ALL 1–7 letter/number tokens
      const allMatches = [...message.matchAll(/\b([a-zA-Z0-9]{1,7})\b/g)]
      if (!allMatches || allMatches.length === 0) {
        return "I couldn't find a registration in your message. Please provide something like 'Check vehicle with reg ABC123'."
      }

      // Convert to uppercase and exclude common filler words
      const excludedWords = [
        "CAN","YOU","CAR","WHOSE","IS","ME","TELL","THE","WITH","WHAT",
        "OF","FOR","IT","THIS","TO","PLEASE","ARE","ANY","REG","CHECK",
        "VEHICLE","IS?","WHOSE?","CLIENT","CUSTOMER","WHATIS","WHOS","WHO","HIS"
      ]
      let possiblePlates = allMatches.map(m => m[1].toUpperCase())
      possiblePlates = possiblePlates.filter(x => !excludedWords.includes(x))

      if (possiblePlates.length === 0) {
        return "I couldn't find a valid registration in your message. Please provide something like 'Check vehicle with reg ABC123'."
      }

      // Pick the last one found in the message, often the real plate
      const registration = possiblePlates[possiblePlates.length - 1]

      // Lookup the vehicle in Supabase
      const { data: vehicles, error } = await supabaseClient
        .from('vehicles')
        .select(`
          id,
          make,
          model,
          registration,
          color,
          year,
          client:clients(
            first_name,
            last_name
          )
        `)
        .eq('registration', registration)
        .limit(1)

      if (error) {
        console.error('Vehicle lookup error:', error)
        return `I encountered an error while looking up registration "${registration}".`
      }
      if (!vehicles || vehicles.length === 0) {
        return `I couldn't find a vehicle with registration "${registration}".`
      }

      const vehicle = vehicles[0]
      return `Vehicle: ${vehicle.make} ${vehicle.model}, Reg: ${vehicle.registration}, Owner: ${vehicle.client.first_name} ${vehicle.client.last_name}, Year: ${vehicle.year ?? 'N/A'}, Color: ${vehicle.color ?? 'N/A'}.`
    }

    // JOB SHEET (MINIMAL STUB)
    async function handleJobSheetQuery(message: string): Promise<string> {
      // Stub: you can customize to your needs
      return "Job sheet queries are not fully implemented yet. Please specify if you need repair history, completed work, etc."
    }

    // SAFETY PROTOCOL
    async function handleSafetyProtocol(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase()

      // Direct match
      for (const [procedure, instructions] of Object.entries(safetyProtocols)) {
        if (lowerMessage.includes(procedure)) {
          return instructions
        }
      }

      // Partial matches
      const keywords = ['battery', 'tire', 'oil', 'brake', 'jump', 'start', 'changing', 'replace']
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          if (keyword === 'battery') {
            return safetyProtocols['battery change']
          }
          for (const [procedure, instructions] of Object.entries(safetyProtocols)) {
            if (procedure.includes(keyword)) {
              return instructions
            }
          }
        }
      }

      // Fallback to OpenAI
      try {
        console.log('Querying OpenAI for safety procedure')
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are an automotive safety expert for a garage workshop. Provide clear, step-by-step safety procedures. Format as a short, numbered list. Keep it under 250 words."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 350,
          temperature: 0.1
        })
        return completion.choices[0].message.content ||
          "I couldn't find specific safety procedures for that task. Could you clarify the procedure you need?"
      } catch (error) {
        console.error('OpenAI API error:', error)
        return "I have safety protocols for jumpstarting, changing tires, batteries, brake fluid, and oil changes. Which one do you need?"
      }
    }

    // CAR-SPECIFIC
    async function handleCarSpecificQuestion(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase()
      let carModel: string | null = null

      // Identify car model in our local data
      for (const model of Object.keys(vehicleData)) {
        if (lowerMessage.includes(model)) {
          carModel = model
          break
        }
      }

      if (!carModel) {
        return "I'm not sure which vehicle you're referring to. Could you specify the make and model?"
      }

      const carInfo = vehicleData[carModel]

      // Oil capacity
      if (
        lowerMessage.includes('oil') &&
        (lowerMessage.includes('capacity') || lowerMessage.includes('how much') || lowerMessage.includes('how many'))
      ) {
        return `The oil capacity for a ${carModel} is ${carInfo.oilCapacity}.`
      }

      // Tire pressure
      if (
        lowerMessage.includes('tire') &&
        (lowerMessage.includes('pressure') || lowerMessage.includes('psi') || lowerMessage.includes('bar'))
      ) {
        return `The recommended tire pressure for a ${carModel} is ${carInfo.tirePressure}.`
      }

      // Battery
      if (lowerMessage.includes('battery')) {
        return `The battery type for a ${carModel} is ${carInfo.batteryType}.`
      }

      // Service interval
      if (
        lowerMessage.includes('service') &&
        (lowerMessage.includes('interval') || lowerMessage.includes('how often'))
      ) {
        return `The recommended service interval for a ${carModel} is ${carInfo.serviceInterval}.`
      }

      // Otherwise, ask OpenAI
      try {
        console.log('Querying OpenAI for specific car info')
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an automotive expert assistant for a garage workshop. Provide accurate information about the ${carModel}. Keep responses short and factual.`
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 250,
          temperature: 0.1
        })
        return completion.choices[0].message.content ||
          `I have some info on the ${carModel}, but I'm not sure what you're looking for. Ask about oil capacity, tire pressure, battery type, or service intervals.`
      } catch (error) {
        console.error('OpenAI API error:', error)
        return `I have some info on the ${carModel}, but I'm not sure what you're looking for.`
      }
    }

    // GENERAL AUTOMOTIVE
    async function handleGeneralAutomotiveQuestion(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase()
      const generalInfo: Record<string, string> = {
        'oil change': 'Most vehicles need an oil change every 5,000–7,500 miles (or 10,000–15,000 for synthetic). Check your manual.',
        'warning light': 'If a warning light appears, consult your manual. Common lights include check engine, oil pressure, battery, and temperature.',
        'fuel economy': 'To improve fuel economy: maintain tire pressure, reduce weight, avoid excessive idling, accelerate gently, and keep up with maintenance.',
        'brake pad': 'Brake pads usually need replacement every 30,000–70,000 miles, depending on driving conditions and habits.',
        'tire rotation': 'Rotate tires every 5,000–8,000 miles for even wear.'
      }

      // Check built-in answers first
      for (const [topic, info] of Object.entries(generalInfo)) {
        if (lowerMessage.includes(topic)) {
          return info
        }
      }

      // Fallback to OpenAI
      try {
        console.log('Querying OpenAI for automotive knowledge')
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are an automotive expert assistant for a garage workshop. Provide accurate, helpful, and concise automotive information. Keep responses brief."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 300,
          temperature: 0.2
        })
        return completion.choices[0].message.content ||
          "I couldn't get an answer for that automotive question right now."
      } catch (error) {
        console.error('OpenAI API error:', error)
        return "I'm having trouble answering that automotive question right now. Please try again later."
      }
    }

    // NON-AUTOMOTIVE
    async function handleNonAutomotiveQuestion(message: string): Promise<string> {
      try {
        console.log('Handling non-automotive question with OpenAI')
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an assistant for a garage workshop. You can provide brief, general information on non-automotive topics, but keep responses concise."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 150,
          temperature: 0.5
        })
        return completion.choices[0].message.content ||
          "I specialize in automotive topics. For more details on non-automotive subjects, please consult other resources."
      } catch (error) {
        console.error('OpenAI API error:', error)
        return "I'm primarily designed for automotive topics. Is there something about vehicles or our services I can help with?"
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    function parseDateAndTime(text: string): Date | null {
      const now = new Date()
      let appointmentTime = new Date()

      // Handle "tomorrow"
      if (text.toLowerCase().includes('tomorrow')) {
        appointmentTime.setDate(appointmentTime.getDate() + 1)
      }

      // Extract time
      const timeMatch = text.match(/(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)/i)
      if (timeMatch) {
        let hours = parseInt(timeMatch[1])
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
        const period = timeMatch[3].toLowerCase()

        // Convert to 24-hour
        if (period === 'pm' && hours < 12) {
          hours += 12
        } else if (period === 'am' && hours === 12) {
          hours = 0
        }

        appointmentTime.setHours(hours, minutes, 0, 0)

        // If parsed time is in the past (for today), assume tomorrow
        if (appointmentTime < now && !text.toLowerCase().includes('tomorrow')) {
          appointmentTime.setDate(appointmentTime.getDate() + 1)
        }
        return appointmentTime
      }
      return null
    }

    async function createAppointment(
      clientId: string,
      vehicleId: string,
      appointmentTime: Date,
      serviceType: string = 'General Service'
    ) {
      const { data, error } = await supabaseClient
        .from('appointments')
        .insert({
          client_id: clientId,
          vehicle_id: vehicleId,
          scheduled_at: appointmentTime.toISOString(),
          service_type: serviceType,
          status: 'scheduled'
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create appointment: ${error.message}`)
      }
      chatMemory[user_id].lastAppointmentId = data.id
      return data.id
    }

    async function updateAppointmentService(appointmentId: string, serviceType: string) {
      const { data, error } = await supabaseClient
        .from('appointments')
        .update({ service_type: serviceType })
        .eq('id', appointmentId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update appointment: ${error.message}`)
      }
      return data
    }

    async function cancelAppointment(appointmentId: string) {
      const { data, error } = await supabaseClient
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to cancel appointment: ${error.message}`)
      }
      return data
    }

    async function addNewClient(firstName: string, lastName: string, phone?: string, email?: string) {
      const { data, error } = await supabaseClient
        .from('clients')
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          email: email || null
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to add new client: ${error.message}`)
      }
      return data
    }

    async function addVehicle(
      clientId: string,
      make: string,
      model: string,
      registration: string,
      year?: string,
      color?: string
    ) {
      const { data, error } = await supabaseClient
        .from('vehicles')
        .insert({
          client_id: clientId,
          make: make,
          model: model,
          registration: registration.toUpperCase(),
          year: year || null,
          color: color || null
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to add new vehicle: ${error.message}`)
      }
      return data
    }

    // More flexible client finder
    async function findClient(searchTerm: string) {
      const cleanTerm = searchTerm.trim()

      // Quick phone or email check
      const isPhoneNumber = /^[\d\(\)\+\-\s]{7,}$/.test(cleanTerm)
      const isEmail = cleanTerm.includes('@')
      const nameParts = cleanTerm.split(/\s+/)

      let query = supabaseClient
        .from('clients')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          address,
          vehicles (
            id,
            make,
            model,
            registration,
            color,
            year
          )
        `)

      if (isPhoneNumber) {
        const digits = cleanTerm.replace(/\D/g, '')
        query = query.ilike('phone', `%${digits}%`)
      } else if (isEmail) {
        query = query.ilike('email', cleanTerm)
      } else {
        // Basic name search
        if (nameParts.length === 1) {
          query = query.or(`first_name.ilike.%${nameParts[0]}%,last_name.ilike.%${nameParts[0]}%`)
        } else {
          const firstName = nameParts[0]
          const lastName = nameParts[nameParts.length - 1]
          // Try matching first+last or last+first
          query = query.or(
            `first_name.ilike.%${firstName}%.and(last_name.ilike.%${lastName}%)`,
            `first_name.ilike.%${lastName}%.and(last_name.ilike.%${firstName}%)`
          )
        }
      }

      const { data, error } = await query
        .limit(5)
        .order('last_name', { ascending: true })

      if (error || !data || data.length === 0) {
        return null
      }

      if (data.length > 1) {
        console.log(`Multiple clients found for "${cleanTerm}". Returning the first match.`)
      }
      return data[0]
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXECUTE
    // ─────────────────────────────────────────────────────────────────────────────

    const response = await processMessage(message)
    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Request error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
