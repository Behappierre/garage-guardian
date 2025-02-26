import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import OpenAI from 'https://esm.sh/openai@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced chat memory to store more context
const chatMemory: Record<string, {
  lastAppointmentId?: string;
  lastClientId?: string;
  lastClientName?: string;
  lastVehicleId?: string;
  lastRegistration?: string;
  lastConversationContext?: string;
}> = {};

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
  // Add more common vehicles as needed
}

// Safety protocols and procedures
const safetyProtocols = {
  'jumpstart': 'When jumpstarting a vehicle: 1) Connect positive to positive (red to red), 2) Connect negative to engine block of dead car (not directly to battery), 3) Start donor vehicle, 4) Start receiving vehicle, 5) Disconnect in reverse order.',
  'tire change': 'To safely change a tire: 1) Park on level ground, 2) Apply parking brake, 3) Place wheel chocks, 4) Loosen lug nuts before jacking, 5) Place jack under manufacturer-recommended lifting points, 6) Raise vehicle until tire clears ground, 7) Remove lug nuts and tire, 8) Install spare tire, 9) Hand-tighten lug nuts, 10) Lower vehicle, 11) Torque lug nuts to spec in star pattern.',
  'brake fluid': 'When handling brake fluid: 1) Always wear gloves to protect skin, 2) Avoid spilling on painted surfaces as it damages paint, 3) Keep container sealed when not in use, 4) Dispose of old fluid properly at designated facilities, 5) Never mix different types/grades of brake fluid.',
  'oil change': 'For safe oil changes: 1) Ensure engine is warm but not hot, 2) Place oil catch pan under drain plug, 3) Remove fill cap before drain plug, 4) Dispose of used oil at recycling center, 5) Replace filter with each oil change, 6) Refill with manufacturer-recommended oil grade and quantity.',
  'battery change': 'Safety procedure for changing a car battery: 1) Wear protective gloves and eye protection, 2) Ensure ignition and all electrical components are off, 3) Disconnect the negative (-) terminal first, then the positive (+), 4) Remove any battery hold-down clamps, 5) Carefully lift out old battery using proper lifting technique, 6) Clean terminal connections and battery tray, 7) Install new battery, 8) Connect positive (+) terminal first, then negative (-), 9) Ensure connections are tight but not over-tightened, 10) Dispose of old battery at a recycling center.',
  'changing a battery': 'To safely change a car battery: 1) Wear protective gloves and eye protection, 2) Turn off all electronics and remove key from ignition, 3) Identify battery terminals (red is positive, black is negative), 4) Disconnect negative terminal first to prevent shorts, 5) Disconnect positive terminal, 6) Remove battery hold-down bracket, 7) Carefully remove old battery (they're heavy), 8) Clean battery tray and terminals, 9) Install new battery, 10) Connect positive terminal first, then negative, 11) Ensure connections are secure, 12) Recycle old battery at authorized facility.',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, user_id } = await req.json()
    console.log('Received message:', message, 'from user:', user_id)

    if (!chatMemory[user_id]) {
      chatMemory[user_id] = {};
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? ''
    })

    // Main message processing function
    async function processMessage(message: string) {
      console.log('Processing message:', message);
      console.log('Current chat memory:', chatMemory[user_id]);
      
      // Determine query type
      const queryType = determineQueryType(message);
      console.log('Query type detected:', queryType);
      
      // Store conversation context
      chatMemory[user_id].lastConversationContext = queryType;
      
      try {
        // Route to appropriate handler based on query type
        switch (queryType) {
          case 'booking':
            return await handleBookingQuery(message);
          case 'client_management':
            return await handleClientManagement(message);
          case 'client_lookup':
            return await handleClientLookup(message);
          case 'vehicle_lookup':
            return await handleVehicleLookup(message);
          case 'job_sheet':
            return await handleJobSheetQuery(message);
          case 'car_specific':
            return await handleCarSpecificQuestion(message);
          case 'safety_protocol':
            return await handleSafetyProtocol(message);
          case 'general_automotive':
            return await handleGeneralAutomotiveQuestion(message);
          case 'non_automotive':
            return await handleNonAutomotiveQuestion(message);
          default:
            return await handleGeneralAutomotiveQuestion(message);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        return `I encountered an error while processing your request: ${error.message}. Please try again or rephrase your question.`;
      }
    }

    // Function to handle booking-related queries
    async function handleBookingQuery(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase();
      
      // Handle appointment cancellation
      if (lowerMessage.includes('cancel') && lowerMessage.includes('appointment')) {
        // Check if we have a specific appointment ID in memory or need to find by client
        if (chatMemory[user_id].lastAppointmentId) {
          try {
            await cancelAppointment(chatMemory[user_id].lastAppointmentId);
            return `I've cancelled the appointment for ${chatMemory[user_id].lastClientName}.`;
          } catch (error) {
            console.error('Cancellation error:', error);
            return "I had trouble cancelling the appointment. Please try again.";
          }
        } else {
          // Try to extract client name
          const clientMatch = message.match(/(?:cancel|appointment)(?:.*)(?:for|of)\s+([a-zA-Z ]+)/i);
          if (!clientMatch) {
            return "I need a client name to cancel an appointment. Please specify whose appointment to cancel.";
          }
          
          const clientName = clientMatch[1].trim();
          const client = await findClient(clientName);
          
          if (!client) {
            return `I couldn't find a client named "${clientName}" in our system.`;
          }
          
          // Get most recent active appointment
          const { data: appointment, error } = await supabaseClient
            .from('appointments')
            .select('id')
            .eq('client_id', client.id)
            .eq('status', 'scheduled')
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .single();
          
          if (error || !appointment) {
            return `I couldn't find any active appointments for ${client.first_name} ${client.last_name}.`;
          }
          
          try {
            await cancelAppointment(appointment.id);
            return `I've cancelled the appointment for ${client.first_name} ${client.last_name}.`;
          } catch (error) {
            console.error('Cancellation error:', error);
            return "I had trouble cancelling the appointment. Please try again.";
          }
        }
      }
      
      // Handle appointment service update
      if ((lowerMessage.includes('add') || lowerMessage.includes('change')) && 
          lowerMessage.includes('service') && 
          (lowerMessage.includes('booking') || lowerMessage.includes('appointment'))) {
        
        if (!chatMemory[user_id]?.lastAppointmentId) {
          return "I couldn't find a recent booking to update. Could you try making the booking request again?";
        }

        const serviceMatch = message.match(/(?:add|change)(?:.*)(to|with)?\s+([A-Za-z]+)\s+service/i);
        if (!serviceMatch) {
          return "Please specify what type of service you'd like to add.";
        }

        const serviceType = `${serviceMatch[2]} Service`;
        try {
          await updateAppointmentService(chatMemory[user_id].lastAppointmentId, serviceType);
          return `I've updated the service type to "${serviceType}" for ${chatMemory[user_id].lastClientName}'s appointment.`;
        } catch (error) {
          console.error('Service update error:', error);
          return "I had trouble updating the service type. Please try again.";
        }
      }

      // Handle new booking request
      const bookingMatch = message.match(/(?:book|appointment|booking)\s+(?:for|with)\s+([a-zA-Z ]+?)(?:\s+(?:at|on|tomorrow|for|,|\s)\s*(.*))?$/i);
      
      if (!bookingMatch) {
        return "I couldn't understand the booking request. Please use format: 'Book an appointment for [name]' or 'Book for [name] tomorrow at 1pm'";
      }

      const clientName = bookingMatch[1].trim();
      const timeInfo = bookingMatch[2];

      const client = await findClient(clientName);
      if (!client) {
        return `I couldn't find a client named "${clientName}" in our system.`;
      }

      // Store client info in chat memory
      chatMemory[user_id].lastClientId = client.id;
      chatMemory[user_id].lastClientName = `${client.first_name} ${client.last_name}`;

      if (!timeInfo) {
        return `I found ${client.first_name} ${client.last_name}. When would you like to schedule the appointment?`;
      }

      const appointmentTime = parseDateAndTime(timeInfo);
      if (!appointmentTime) {
        return "I couldn't understand the time format. Please specify a time like '1pm' or '2:30pm'.";
      }

      if (!client.vehicles?.[0]) {
        return `${client.first_name} ${client.last_name} doesn't have any vehicles registered. Please add a vehicle first.`;
      }

      chatMemory[user_id].lastVehicleId = client.vehicles[0].id;

      try {
        await createAppointment(client.id, client.vehicles[0].id, appointmentTime);
        return `Perfect! I've booked an appointment for ${client.first_name} ${client.last_name} on ${
          appointmentTime.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }. The booking is confirmed in the system.`;
      } catch (error) {
        console.error('Booking error:', error);
        return "I encountered an error while creating the appointment. Please try again.";
      }
    }

    // Function to parse date and time from text
    function parseDateAndTime(text: string): Date | null {
      const now = new Date();
      let appointmentTime = new Date();
      
      // Handle "tomorrow"
      if (text.toLowerCase().includes('tomorrow')) {
        appointmentTime.setDate(appointmentTime.getDate() + 1);
      }
      
      // Extract time
      const timeMatch = text.match(/(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const period = timeMatch[3].toLowerCase();
        
        // Convert to 24-hour format
        if (period === 'pm' && hours < 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        appointmentTime.setHours(hours, minutes, 0, 0);
        
        // If the parsed time is in the past (for today), assume tomorrow
        if (appointmentTime < now && !text.toLowerCase().includes('tomorrow')) {
          appointmentTime.setDate(appointmentTime.getDate() + 1);
        }
        
        return appointmentTime;
      }
      
      return null;
    }
    
    // Function to create an appointment
    async function createAppointment(clientId: string, vehicleId: string, appointmentTime: Date, serviceType: string = 'General Service') {
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
        .single();
      
      if (error) {
        throw new Error(`Failed to create appointment: ${error.message}`);
      }
      
      // Store the appointment ID in memory
      chatMemory[user_id].lastAppointmentId = data.id;
      
      return data.id;
    }

    // Function to update an appointment's service
    async function updateAppointmentService(appointmentId: string, serviceType: string) {
      const { data, error } = await supabaseClient
        .from('appointments')
        .update({ service_type: serviceType })
        .eq('id', appointmentId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update appointment: ${error.message}`);
      }
      
      return data;
    }

    // Function to cancel an appointment
    async function cancelAppointment(appointmentId: string) {
      const { data, error } = await supabaseClient
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to cancel appointment: ${error.message}`);
      }
      
      return data;
    }

    // Function to handle general automotive questions
    async function handleGeneralAutomotiveQuestion(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase();
      
      // Some common general automotive Q&A for quick responses
      const generalInfo = {
        'oil change': 'Most vehicles should have their oil changed every 5,000 to 7,500 miles. Synthetic oil typically allows for longer intervals of 10,000 to 15,000 miles. Always consult your owner\'s manual for the manufacturer\'s recommendation.',
        'warning light': 'If a warning light appears on your dashboard, consult your owner\'s manual for its meaning. Common warnings include check engine, oil pressure, battery charge, and temperature warnings. It\'s best to address these promptly to avoid larger issues.',
        'fuel economy': 'To improve fuel economy: 1) Maintain proper tire pressure, 2) Remove excess weight, 3) Avoid excessive idling, 4) Use cruise control on highways, 5) Accelerate gently, 6) Keep up with regular maintenance.',
        'brake pad': 'Brake pads typically need replacement every 30,000 to 70,000 miles, depending on driving habits and conditions. Signs they need replacement include squealing/grinding noises, vibration when braking, longer stopping distance, or a brake warning light.',
        'tire rotation': 'Tires should be rotated approximately every 5,000 to 8,000 miles to ensure even wear. This helps extend tire life and maintain optimal handling and traction.',
      };
      
      // First try our built-in knowledge base
      for (const [topic, info] of Object.entries(generalInfo)) {
        if (lowerMessage.includes(topic)) {
          return info;
        }
      }
      
      // If we don't have a built-in answer, use OpenAI
      try {
        console.log('Querying OpenAI for automotive knowledge');
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo", // or use a different model like "gpt-3.5-turbo"
          messages: [
            {
              role: "system", 
              content: "You are an automotive expert assistant for a garage workshop. Provide accurate, helpful, and concise information about automotive repair, maintenance, and diagnostics. Keep responses brief and to the point. Include only essential information that a garage workshop manager would need. If you're unsure about specific details for a particular vehicle model, mention that exact specifications may vary and recommend checking the vehicle manual."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 300,
          temperature: 0.2 // Lower temperature for more factual responses
        });
        
        // Return the AI-generated response
        const aiResponse = completion.choices[0].message.content;
        return aiResponse || "I couldn't get an answer for that automotive question right now. Please try a different question.";
      } catch (error) {
        console.error('OpenAI API error:', error);
        return "I'm having trouble answering that automotive question right now. For specific vehicle information, please check your vehicle's manual or speak with one of our technicians directly.";
      }
    }
    
    // Function to handle non-automotive questions (limited capabilities)
    async function handleNonAutomotiveQuestion(message: string): Promise<string> {
      try {
        console.log('Handling non-automotive question with OpenAI');
        
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Using a more basic model for non-automotive queries
          messages: [
            {
              role: "system", 
              content: "You are an assistant for a garage workshop. While you primarily focus on automotive topics, you can provide brief, general information on other topics. Keep responses concise and polite. If the query is complex or outside your scope, recommend they consult appropriate resources. Always bring the conversation back to automotive or workshop context when possible."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 150, // Shorter responses for non-automotive topics
          temperature: 0.5
        });
        
        // Return the AI-generated response
        const aiResponse = completion.choices[0].message.content;
        return aiResponse || "I specialize in automotive and garage-related topics. For more detailed information on other subjects, please consult appropriate resources.";
      } catch (error) {
        console.error('OpenAI API error:', error);
        return "I'm primarily designed to help with automotive and garage-related questions. Is there anything about vehicles or our services I can help you with instead?";
      }
    }
    
    // Function to handle safety protocol questions
    async function handleSafetyProtocol(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase();
      
      // Check for exact matches in our predefined protocols
      for (const [procedure, instructions] of Object.entries(safetyProtocols)) {
        if (lowerMessage.includes(procedure)) {
          return instructions;
        }
      }
      
      // Check for partial matches
      const keywords = ['battery', 'tire', 'oil', 'brake', 'jump', 'start', 'changing', 'replace'];
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          // For battery-related questions
          if (keyword === 'battery') {
            return safetyProtocols['battery change'];
          }
          
          // For other car components, use related protocols if available
          for (const [procedure, instructions] of Object.entries(safetyProtocols)) {
            if (procedure.includes(keyword)) {
              return instructions;
            }
          }
        }
      }
      
      // If no match found, use OpenAI to handle the safety procedure question
      try {
        console.log('Querying OpenAI for safety procedure');
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system", 
              content: "You are an automotive safety expert for a garage workshop. Provide clear, step-by-step safety procedures for automotive maintenance and repair tasks. Focus on safety precautions, proper tools, and the correct sequence of steps. Format your answer as a numbered list. Keep your response under 250 words and make it easy to follow."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 350,
          temperature: 0.1
        });
        
        return completion.choices[0].message.content || "I couldn't find specific safety procedures for that task. Please ask about jumpstarting, changing tires, battery replacement, brake fluid handling, or oil changes.";
      } catch (error) {
        console.error('OpenAI API error:', error);
        return "I have safety protocols for jumpstarting cars, changing tires, handling brake fluid, changing batteries, and performing oil changes. Could you specify which procedure you'd like information about?";
      }
    }

    // Function to handle specific car questions
    async function handleCarSpecificQuestion(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase();
      
      // Try to identify the car model being asked about
      let carModel = null;
      for (const model of Object.keys(vehicleData)) {
        if (lowerMessage.includes(model)) {
          carModel = model;
          break;
        }
      }
      
      if (!carModel) {
        return "I'm not sure which vehicle you're asking about. Could you specify the make and model?";
      }
      
      const carInfo = vehicleData[carModel];
      
      // Oil capacity question
      if (lowerMessage.includes('oil') && 
         (lowerMessage.includes('capacity') || lowerMessage.includes('how much') || lowerMessage.includes('how many'))) {
        return `The oil capacity for a ${carModel} is ${carInfo.oilCapacity}.`;
      }
      
      // Tire pressure question
      if (lowerMessage.includes('tire') && 
         (lowerMessage.includes('pressure') || lowerMessage.includes('psi') || lowerMessage.includes('bar'))) {
        return `The recommended tire pressure for a ${carModel} is ${carInfo.tirePressure}.`;
      }
      
      // Battery question
      if (lowerMessage.includes('battery')) {
        return `The battery type for a ${carModel} is ${carInfo.batteryType}.`;
      }
      
      // Service interval question
      if (lowerMessage.includes('service') && 
         (lowerMessage.includes('interval') || lowerMessage.includes('how often'))) {
        return `The recommended service interval for a ${carModel} is ${carInfo.serviceInterval}.`;
      }
      
      // If we can't answer from our database, try OpenAI
      try {
        console.log('Querying OpenAI for specific car information');
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system", 
              content: `You are an automotive expert assistant for a garage workshop. Provide accurate information about the ${carModel}. Focus only on technical specifications and maintenance requirements. Keep responses short and factual. If you don't know specific details, say so rather than guessing.`
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 250,
          temperature: 0.1
        });
        
        return completion.choices[0].message.content || `I have information about the ${carModel}, but I'm not sure what specific detail you're looking for. You can ask about oil capacity, tire pressure, battery type, or service intervals.`;
      } catch (error) {
        console.error('OpenAI API error:', error);
        return `I have information about the ${carModel}, but I'm not sure what specific detail you're looking for. You can ask about oil capacity, tire pressure, battery type, or service intervals.`;
      }
    }

    // Function to add a new client to the system
    async function addNewClient(firstName: string, lastName: string, phone?: string, email?: string): Promise<any> {
      const { data, error } = await supabaseClient
        .from('clients')
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          email: email || null
        })
        .select('id')
        .single();
      
      if (error) {
        throw new Error(`Failed to add new client: ${error.message}`);
      }
      
      return data;
    }

    // Function to add a new vehicle to a client
    async function addVehicle(clientId: string, make: string, model: string, registration: string, 
                             year?: string, color?: string): Promise<any> {
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
        .single();
      
      if (error) {
        throw new Error(`Failed to add new vehicle: ${error.message}`);
      }
      
      return data;
    }

    // Function to determine the type of query
    function determineQueryType(message: string): string {
      const lowerMessage = message.toLowerCase();
      
      // Client management queries (add client/vehicle)
      const clientManagementKeywords = ['add client', 'new client', 'create client', 'add vehicle', 'new vehicle', 'register vehicle'];
      if (clientManagementKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'client_management';
      }
      
      // Booking-related queries
      const bookingKeywords = ['book', 'appointment', 'booking', 'schedule', 'reserve', 'cancel', 'reschedule'];
      if (bookingKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'booking';
      }
      
      // Client lookup queries
      const clientLookupKeywords = ['client', 'customer', 'phone', 'email', 'address', 'contact'];
      if (clientLookupKeywords.some(keyword => lowerMessage.includes(keyword)) || 
          lowerMessage.includes('who is') || lowerMessage.includes('find client')) {
        return 'client_lookup';
      }
      
      // Vehicle registration lookup - check this after other lookups to prevent misclassification
      const regPattern = /\b([a-zA-Z0-9]{1,7})\b/i;
      const hasRegPattern = regPattern.test(lowerMessage);
      const regContextWords = ['registration', 'reg', 'plate', 'car with', 'whose car'];
      const hasRegContext = regContextWords.some(word => lowerMessage.includes(word));
                         
      if (hasRegPattern && hasRegContext) {
        return 'vehicle_lookup';
      }
      
      // Vehicle lookup queries
      const vehicleLookupKeywords = ['whose car', 'vehicle info', 'car details', 'find vehicle'];
      if (vehicleLookupKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'vehicle_lookup';
      }
      
      // Job sheet queries
      const jobSheetKeywords = ['job', 'work', 'repair', 'service history', 'maintenance', 'fixed', 'completed'];
      if (jobSheetKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'job_sheet';
      }
      
      // Safety protocol questions - check this before car_specific
      const safetyKeywords = ['safety', 'procedure', 'protocol', 'how to', 'steps', 'guide', 'change a', 'changing a', 'replace a', 'replacing a'];
      if (safetyKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'safety_protocol';
      }
      
      // Specific car questions
      const carSpecificKeywords = ['how many', 'what type', 'how much', 'how often', 'car', 'vehicle'];
      const automotiveKeywords = ['engine', 'motor', 'transmission', 'brakes', 'tires', 'wheels', 'oil', 'fuel', 'battery'];
      if (carSpecificKeywords.some(keyword => lowerMessage.includes(keyword)) ||
          automotiveKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'car_specific';
      }
      
      // Non-automotive queries
      const nonAutoKeywords = ['weather', 'news', 'sports', 'movie', 'music', 'food', 'recipe', 'travel', 'holiday', 'joke'];
      if (nonAutoKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'non_automotive';
      }
      
      // Default to general automotive
      return 'general_automotive';
    }

    // Function to find a client by various criteria (more flexible search)
    async function findClient(searchTerm: string) {
      // Clean and normalize the search term
      const cleanTerm = searchTerm.trim();
      
      // Check if the search term might be a phone number
      const isPhoneNumber = /^[\d\(\)\+\-\s]{7,}$/.test(cleanTerm);
      
      // Check if the search term might be an email
      const isEmail = cleanTerm.includes('@');
      
      // Split for name search
      const nameParts = cleanTerm.split(' ');
      
      // Initialize query
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
        `);

      // If it looks like a phone number, search by phone
      if (isPhoneNumber) {
        // Remove non-digit characters for phone number search
        const digits = cleanTerm.replace(/\D/g, '');
        query = query.ilike('phone', `%${digits}%`);
      } 
      // If it looks like an email, search by email
      else if (isEmail) {
        query = query.ilike('email', cleanTerm);
      } 
      // Otherwise search by name
      else {
        if (nameParts.length === 1) {
          // Single word could be first name or last name
          query = query.or(`first_name.ilike.%${nameParts[0]}%,last_name.ilike.%${nameParts[0]}%`);
        } else if (nameParts.length > 1) {
          // More sophisticated name matching with multiple parts
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];
          
          // Try both combinations (first_name+last_name and last_name+first_name)
          query = query.or(
            `first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`,
            `first_name.ilike.%${lastName}%,last_name.ilike.%${firstName}%`
          );
        }
      }

      const { data, error } = await query.limit(5).order('last_name', { ascending: true }); // Get top 5 potential matches
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      // If multiple results, try to find best match
      if (data.length > 1) {
        // Exact match by full name takes priority
        for (const client of data) {
          const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
          if (fullName === cleanTerm.toLowerCase()) {
            return client;
          }
        }
        // Otherwise return first match
        return data[0];
      }
      
      return data[0];
    }
