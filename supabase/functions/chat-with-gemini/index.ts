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

    // Function to handle client lookup queries
    async function handleClientLookup(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase();
      
      // Looking for clients by registration
      if (lowerMessage.includes('registration') || lowerMessage.includes('reg') || lowerMessage.includes('plate')) {
        const regMatch = lowerMessage.match(/(?:registration|reg|plate)\s+([A-Z0-9 ]+)/i);
        if (regMatch) {
          const registration = regMatch[1].trim().toUpperCase();
          
          // Query to find client by vehicle registration
          const { data: vehicle, error } = await supabaseClient
            .from('vehicles')
            .select(`
              id,
              client_id,
              clients (
                id, 
                first_name,
                last_name,
                phone,
                email,
                address
              )
            `)
            .ilike('registration', `%${registration}%`)
            .single();
          
          if (error || !vehicle || !vehicle.clients) {
            return `I couldn't find a client with vehicle registration "${registration}" in our system.`;
          }
          
          const client = vehicle.clients;
          
          // Store in memory for context
          chatMemory[user_id].lastClientId = client.id;
          chatMemory[user_id].lastClientName = `${client.first_name} ${client.last_name}`;
          chatMemory[user_id].lastVehicleId = vehicle.id;
          
          return `Owner of vehicle with registration ${registration}:
Name: ${client.first_name} ${client.last_name}
Phone: ${client.phone || 'Not provided'}
Email: ${client.email || 'Not provided'}
Address: ${client.address || 'Not provided'}`;
        }
      }
      
      // Looking up client by phone number
      const phoneMatch = lowerMessage.match(/(?:phone|number|call)\s+([0-9\+\-\(\)\s]{7,})/i);
      if (phoneMatch) {
        const phoneNumber = phoneMatch[1].trim().replace(/\D/g, '');
        
        const { data: clients, error } = await supabaseClient
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
              registration
            )
          `)
          .ilike('phone', `%${phoneNumber}%`)
          .limit(1);
        
        if (error || !clients || clients.length === 0) {
          return `I couldn't find a client with phone number containing "${phoneMatch[1]}" in our system.`;
        }
        
        const client = clients[0];
        
        // Store in memory for context
        chatMemory[user_id].lastClientId = client.id;
        chatMemory[user_id].lastClientName = `${client.first_name} ${client.last_name}`;
        
        let vehicleInfo = '';
        if (client.vehicles && client.vehicles.length > 0) {
          vehicleInfo = '\n\nVehicles:';
          client.vehicles.forEach((vehicle, index) => {
            vehicleInfo += `\n${index + 1}. ${vehicle.make} ${vehicle.model} (${vehicle.registration})`;
          });
        }
        
        return `Client with phone ${client.phone}:
Name: ${client.first_name} ${client.last_name}
Email: ${client.email || 'Not provided'}
Address: ${client.address || 'Not provided'}${vehicleInfo}`;
      }
      
      // Looking up a client by name or general client lookup
      const nameMatch = lowerMessage.match(/(?:who is|find|client|customer|details for)\s+([a-zA-Z ]+)/i) ||
                        lowerMessage.match(/(?:phone|number|email|address|details)(?:.*)(?:of|for)\s+([a-zA-Z ]+)/i);
      
      if (nameMatch) {
        const clientName = nameMatch[1].trim();
        const client = await findClient(clientName);
        
        if (client) {
          // Store in memory for context
          chatMemory[user_id].lastClientId = client.id;
          chatMemory[user_id].lastClientName = `${client.first_name} ${client.last_name}`;
          
          // Get upcoming appointments
          const { data: appointments, error: apptError } = await supabaseClient
            .from('appointments')
            .select(`
              id,
              scheduled_at,
              service_type,
              status,
              vehicle:vehicles (
                make,
                model,
                registration
              )
            `)
            .eq('client_id', client.id)
            .gt('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true })
            .limit(2);
          
          let appointmentInfo = '';
          if (!apptError && appointments && appointments.length > 0) {
            appointmentInfo = '\n\nUpcoming Appointments:';
            appointments.forEach((appt, index) => {
              const date = new Date(appt.scheduled_at).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
              
              const vehicle = appt.vehicle
                ? `${appt.vehicle.make} ${appt.vehicle.model} (${appt.vehicle.registration})`
                : 'Unknown vehicle';
              
              appointmentInfo += `\n${index + 1}. ${date} - ${appt.service_type || 'General Service'} - ${vehicle}`;
            });
          }
          
          let vehicleInfo = '';
          if (client.vehicles && client.vehicles.length > 0) {
            vehicleInfo = '\n\nVehicles:';
            client.vehicles.forEach((vehicle, index) => {
              vehicleInfo += `\n${index + 1}. ${vehicle.make} ${vehicle.model} (${vehicle.registration})`;
            });
          }
          
          return `Client: ${client.first_name} ${client.last_name}
Phone: ${client.phone || 'Not provided'}
Email: ${client.email || 'Not provided'}
Address: ${client.address || 'Not provided'}${vehicleInfo}${appointmentInfo}`;
        } else {
          return `I couldn't find a client named "${clientName}" in our system.`;
        }
      }
      
      // Looking up all clients - limited to prevent overwhelming results
      if (lowerMessage.includes('all clients') || lowerMessage.includes('client list')) {
        const { data: clients, error } = await supabaseClient
          .from('clients')
          .select('id, first_name, last_name, phone')
          .order('last_name', { ascending: true })
          .limit(10);
        
        if (error || !clients || clients.length === 0) {
          return "No clients found in the system.";
        }
        
        let response = `Latest 10 clients in the system:\n\n`;
        clients.forEach((client, index) => {
          response += `${index + 1}. ${client.first_name} ${client.last_name} - ${client.phone || 'No phone'}\n`;
        });
        
        return response;
      }
      
      return "I couldn't understand your client lookup request. Please try phrasing it differently, for example: 'Find client John Smith' or 'What's the phone number for Jane Doe?'";
      }
    }import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

    // Function to determine the type of query
    function determineQueryType(message: string): string {
      const lowerMessage = message.toLowerCase();
      
      // Client management queries (add client/vehicle)
      const clientManagementKeywords = ['add client', 'new client', 'create client', 'add vehicle', 'new vehicle', 'register vehicle'];
      if (clientManagementKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'client_management';
      }
      const lowerMessage = message.toLowerCase();
      
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
      
      // Vehicle lookup queries
      const vehicleLookupKeywords = ['registration', 'reg', 'plate', 'whose car'];
      if (vehicleLookupKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'vehicle_lookup';
      }
      
      // Job sheet queries
      const jobSheetKeywords = ['job', 'work', 'repair', 'service history', 'maintenance', 'fixed', 'completed'];
      if (jobSheetKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'job_sheet';
      }
      
      // Safety protocol questions - check this first before car_specific
      const safetyKeywords = ['safety', 'procedure', 'protocol', 'how to', 'steps', 'guide', 'change a', 'changing a', 'replace a', 'replacing a'];
      if (safetyKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return 'safety_protocol';
      }
      
      // Specific car questions
      if (lowerMessage.includes('how many') || lowerMessage.includes('what type') || 
          lowerMessage.includes('how much') || lowerMessage.includes('how often') ||
          lowerMessage.includes('car') || lowerMessage.includes('vehicle')) {
        return 'car_specific';
      }
      
      // Default to general automotive
      return 'general_automotive';
    }

    // Function to handle client lookup queries
    async function handleClientLookup(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase();
      
      // Looking up a client by name
      const nameMatch = lowerMessage.match(/(?:who is|find|client|customer|details for)\s+([a-zA-Z ]+)/i);
      if (nameMatch) {
        const clientName = nameMatch[1].trim();
        const client = await findClient(clientName);
        
        if (client) {
          // Store in memory for context
          chatMemory[user_id].lastClientId = client.id;
          chatMemory[user_id].lastClientName = `${client.first_name} ${client.last_name}`;
          
          return `Client: ${client.first_name} ${client.last_name}
Phone: ${client.phone || 'Not provided'}
Email: ${client.email || 'Not provided'}
Address: ${client.address || 'Not provided'}
Registered Vehicles: ${client.vehicles?.length || 0}`;
        } else {
          return `I couldn't find a client named "${clientName}" in our system.`;
        }
      }
      
      // Looking up a client's phone number
      if (lowerMessage.includes('phone') || lowerMessage.includes('number')) {
        const phoneMatch = lowerMessage.match(/(?:phone|number)(?:.*)(?:of|for)\s+([a-zA-Z ]+)/i);
        if (phoneMatch) {
          const clientName = phoneMatch[1].trim();
          const client = await findClient(clientName);
          
          if (client) {
            chatMemory[user_id].lastClientId = client.id;
            chatMemory[user_id].lastClientName = `${client.first_name} ${client.last_name}`;
            
            return client.phone 
              ? `${client.first_name} ${client.last_name}'s phone number is ${client.phone}.`
              : `${client.first_name} ${client.last_name} doesn't have a phone number in our system.`;
          } else {
            return `I couldn't find a client named "${clientName}" in our system.`;
          }
        }
      }
      
      return "I couldn't understand your client lookup request. Please try phrasing it differently.";
    }

    // Function to handle vehicle lookup queries
    async function handleVehicleLookup(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase();
      
      // Looking up a vehicle by registration
      const regMatch = lowerMessage.match(/(?:car|vehicle|registration|reg|plate)\s+([A-Z0-9 ]+)/i) ||
                        lowerMessage.match(/whose\s+car\s+is\s+([A-Z0-9 ]+)/i);
      
      if (regMatch) {
        const registration = regMatch[1].trim().toUpperCase();
        
        // Query the database for the vehicle
        const { data: vehicle, error } = await supabaseClient
          .from('vehicles')
          .select(`
            id,
            make,
            model,
            year,
            color,
            registration,
            client_id,
            clients (
              id,
              first_name,
              last_name,
              phone,
              email
            )
          `)
          .ilike('registration', `%${registration}%`)
          .limit(1)
          .single();
        
        if (error || !vehicle) {
          // Try searching by make and model if registration fails
          const makeModelMatch = lowerMessage.match(/(?:find|about|info)\s+([a-zA-Z0-9 ]+)\s+([a-zA-Z0-9 ]+)/i);
          if (makeModelMatch) {
            const make = makeModelMatch[1].trim();
            const model = makeModelMatch[2].trim();
            
            const { data: vehicles, error: vehiclesError } = await supabaseClient
              .from('vehicles')
              .select(`
                id,
                make,
                model,
                year,
                color,
                registration,
                client_id,
                clients (
                  id,
                  first_name,
                  last_name,
                  phone
                )
              `)
              .ilike('make', `%${make}%`)
              .ilike('model', `%${model}%`)
              .limit(5);
            
            if (vehiclesError || !vehicles || vehicles.length === 0) {
              return `I couldn't find any ${make} ${model} vehicles in our system.`;
            }
            
            // Return multiple vehicle matches
            let response = `Found ${vehicles.length} ${make} ${model} vehicles:\n\n`;
            vehicles.forEach((v, index) => {
              response += `${index + 1}. ${v.make} ${v.model} (${v.year || 'N/A'}) - ${v.registration}\n`;
              response += `   Color: ${v.color || 'Not specified'}\n`;
              if (v.clients) {
                response += `   Owner: ${v.clients.first_name} ${v.clients.last_name}\n`;
              }
              response += '\n';
            });
            
            return response;
          }
          
          return `I couldn't find a vehicle with registration "${registration}" in our system.`;
        }
        
        // Store in memory for context
        chatMemory[user_id].lastVehicleId = vehicle.id;
        chatMemory[user_id].lastRegistration = registration;
        if (vehicle.clients) {
          chatMemory[user_id].lastClientId = vehicle.clients.id;
          chatMemory[user_id].lastClientName = `${vehicle.clients.first_name} ${vehicle.clients.last_name}`;
        }
        
        // Get service history for this vehicle
        const { data: serviceHistory, error: serviceError } = await supabaseClient
          .from('job_sheets')
          .select(`
            id,
            service_type,
            description,
            status,
            completed_at
          `)
          .eq('vehicle_id', vehicle.id)
          .order('completed_at', { ascending: false })
          .limit(2);
        
        // Build comprehensive response with vehicle data and service history
        const response = `Vehicle Registration: ${vehicle.registration}
Make: ${vehicle.make || 'Not specified'}
Model: ${vehicle.model || 'Not specified'}
Year: ${vehicle.year || 'Not specified'}
Color: ${vehicle.color || 'Not specified'}
Owner: ${vehicle.clients ? `${vehicle.clients.first_name} ${vehicle.clients.last_name}` : 'Unknown'}
Contact: ${vehicle.clients?.phone || vehicle.clients?.email || 'Not provided'}

${serviceHistory && serviceHistory.length > 0 ? 'Recent service history:' : 'No recent service history available.'}
${serviceHistory && serviceHistory.length > 0 ? serviceHistory.map((job, i) => 
  `${i+1}. ${new Date(job.completed_at).toLocaleDateString() || 'Scheduled'} - ${job.service_type} - ${job.status}`
).join('\n') : ''}`;
        
        return response;
      }
      
      return "I couldn't understand your vehicle lookup request. Please provide a registration number or make and model.";
    }

    // Function to handle job sheet queries
    async function handleJobSheetQuery(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase();
      
      // Looking up job history for a specific client
      const clientMatch = lowerMessage.match(/(?:job|work|repair|service)(?:.*)(?:for|of)\s+([a-zA-Z ]+)/i);
      if (clientMatch) {
        const clientName = clientMatch[1].trim();
        const client = await findClient(clientName);
        
        if (!client) {
          return `I couldn't find a client named "${clientName}" in our system.`;
        }
        
        // Query job sheets for this client
        const { data: jobs, error } = await supabaseClient
          .from('job_sheets')
          .select(`
            id,
            appointment_id,
            service_type,
            description,
            status,
            cost,
            completed_at,
            vehicle_id,
            appointment:appointments (
              scheduled_at,
              vehicle:vehicles (
                make,
                model,
                registration
              )
            )
          `)
          .eq('client_id', client.id)
          .order('completed_at', { ascending: false })
          .limit(5);
        
        if (error || !jobs || jobs.length === 0) {
          return `No job history found for ${client.first_name} ${client.last_name}.`;
        }
        
        // Format job history
        let response = `Recent job history for ${client.first_name} ${client.last_name}:\n\n`;
        jobs.forEach((job, index) => {
          const date = job.completed_at 
            ? new Date(job.completed_at).toLocaleDateString() 
            : (job.appointment?.scheduled_at 
                ? new Date(job.appointment.scheduled_at).toLocaleDateString()
                : 'Not scheduled');
          
          const vehicle = job.appointment?.vehicle
            ? `${job.appointment.vehicle.make} ${job.appointment.vehicle.model} (${job.appointment.vehicle.registration})`
            : 'Unknown vehicle';
          
          response += `${index + 1}. ${date} - ${job.service_type || 'General Service'} - ${vehicle}\n`;
          response += `   Status: ${job.status || 'Unknown'}\n`;
          if (job.cost) {
            response += `   Cost: ${job.cost.toFixed(2)}\n`;
          }
          if (job.description) {
            response += `   Details: ${job.description}\n`;
          }
          response += '\n';
        });
        
        return response;
      }
      
      // Search for open jobs or jobs in progress
      if (lowerMessage.includes('open job') || 
          lowerMessage.includes('current job') || 
          lowerMessage.includes('in progress')) {
        
        const { data: activeJobs, error } = await supabaseClient
          .from('job_sheets')
          .select(`
            id,
            appointment_id,
            service_type,
            description,
            status,
            client:clients (
              first_name,
              last_name,
              phone
            ),
            vehicle:vehicles (
              make,
              model,
              registration
            )
          `)
          .in('status', ['open', 'in progress'])
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error || !activeJobs || activeJobs.length === 0) {
          return "There are no open or in-progress jobs at the moment.";
        }
        
        let response = `Current active jobs (${activeJobs.length}):\n\n`;
        activeJobs.forEach((job, index) => {
          const client = job.client
            ? `${job.client.first_name} ${job.client.last_name}`
            : 'Unknown client';
            
          const vehicle = job.vehicle
            ? `${job.vehicle.make} ${job.vehicle.model} (${job.vehicle.registration})`
            : 'Unknown vehicle';
          
          response += `${index + 1}. ${job.service_type || 'General Service'} - ${client}\n`;
          response += `   Vehicle: ${vehicle}\n`;
          response += `   Status: ${job.status}\n`;
          if (job.description) {
            response += `   Details: ${job.description}\n`;
          }
          if (job.client?.phone) {
            response += `   Contact: ${job.client.phone}\n`;
          }
          response += '\n';
        });
        
        return response;
      }
      
      // If we have a vehicle in context, check job history for that vehicle
      if (lowerMessage.includes('last service') || lowerMessage.includes('service history')) {
        const regMatch = lowerMessage.match(/(?:for|of)\s+([A-Z0-9 ]+)/i);
        const registration = regMatch ? regMatch[1].trim().toUpperCase() : chatMemory[user_id].lastRegistration;
        
        if (!registration) {
          return "Please specify which vehicle you're asking about, for example: 'Last service for AB12CDE'";
        }
        
        // Query job sheets for this vehicle
        const { data: vehicle, error: vehicleError } = await supabaseClient
          .from('vehicles')
          .select('id, make, model')
          .ilike('registration', `%${registration}%`)
          .single();
        
        if (vehicleError || !vehicle) {
          return `I couldn't find a vehicle with registration "${registration}" in our system.`;
        }
        
        const { data: jobs, error } = await supabaseClient
          .from('job_sheets')
          .select(`
            id,
            service_type,
            description,
            status,
            cost,
            completed_at
          `)
          .eq('vehicle_id', vehicle.id)
          .order('completed_at', { ascending: false })
          .limit(5);
        
        if (error || !jobs || jobs.length === 0) {
          return `No service history found for vehicle ${registration}.`;
        }
        
        // Format service history
        let response = `Service history for ${vehicle.make} ${vehicle.model} (${registration}):\n\n`;
        jobs.forEach((job, index) => {
          const date = job.completed_at 
            ? new Date(job.completed_at).toLocaleDateString() 
            : 'Scheduled';
          
          response += `${index + 1}. ${date} - ${job.service_type || 'General Service'} - Status: ${job.status}\n`;
          if (job.cost) {
            response += `   Cost: ${job.cost.toFixed(2)}\n`;
          }
          if (job.description) {
            response += `   Work completed: ${job.description}\n`;
          }
          response += '\n';
        });
        
        return response;
      }
      
      return "I couldn't understand your job sheet query. Please try asking about service history for a specific client or vehicle, or ask about current open jobs.";
    }

    // Function to handle client management (adding clients/vehicles)
    async function handleClientManagement(message: string): Promise<string> {
      const lowerMessage = message.toLowerCase();
      
      // Adding a new client
      if (lowerMessage.includes('add client') || lowerMessage.includes('new client') || lowerMessage.includes('create client')) {
        // Try to extract client details
        const nameMatch = message.match(/(?:add|new|create)\s+client\s+([a-zA-Z ]+)/i);
        if (!nameMatch) {
          return "To add a new client, please provide their name, like: 'Add client John Smith'";
        }
        
        const fullName = nameMatch[1].trim();
        const nameParts = fullName.split(' ');
        
        if (nameParts.length < 2) {
          return "Please provide both first and last name for the new client.";
        }
        
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        // Check for phone/email in the message
        const phoneMatch = message.match(/phone\s*:?\s*([0-9\+\-\(\)\s]{7,})/i);
        const emailMatch = message.match(/email\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        
        const phone = phoneMatch ? phoneMatch[1].trim() : null;
        const email = emailMatch ? emailMatch[1].trim() : null;
        
        try {
          const newClient = await addNewClient(firstName, lastName, phone, email);
          
          // Store in memory for context
          chatMemory[user_id].lastClientId = newClient.id;
          chatMemory[user_id].lastClientName = `${firstName} ${lastName}`;
          
          return `Successfully added new client: ${firstName} ${lastName}${phone ? ' with phone: ' + phone : ''}${email ? ' and email: ' + email : ''}. The client ID is ${newClient.id}.`;
        } catch (error) {
          console.error('Error adding client:', error);
          return `I had trouble adding the new client. Error: ${error.message}`;
        }
      }
      
      // Adding a new vehicle
      if (lowerMessage.includes('add vehicle') || lowerMessage.includes('new vehicle') || lowerMessage.includes('register vehicle')) {
        // Check if we have client context
        if (!chatMemory[user_id].lastClientId) {
          // Try to extract client name from message
          const clientMatch = message.match(/(?:for|to)\s+client\s+([a-zA-Z ]+)/i) ||
                              message.match(/(?:for|to)\s+([a-zA-Z ]+?)(?:'s)/i);
          
          if (!clientMatch) {
            return "Please specify which client this vehicle belongs to, or first select a client.";
          }
          
          const clientName = clientMatch[1].trim();
          const client = await findClient(clientName);
          
          if (!client) {
            return `I couldn't find a client named "${clientName}" in our system.`;
          }
          
          chatMemory[user_id].lastClientId = client.id;
          chatMemory[user_id].lastClientName = `${client.first_name} ${client.last_name}`;
        }
        
        // Extract vehicle details
        const makeModelMatch = message.match(/(?:add|new|register)\s+vehicle\s+([a-zA-Z0-9]+)\s+([a-zA-Z0-9 ]+)/i);
        const regMatch = message.match(/(?:reg|registration|plate)\s*:?\s*([A-Z0-9 ]+)/i);
        const yearMatch = message.match(/(?:year|from)\s*:?\s*([0-9]{4})/i);
        const colorMatch = message.match(/(?:color|colour)\s*:?\s*([a-zA-Z ]+)/i);
        
        if (!makeModelMatch || !regMatch) {
          return "To add a vehicle, please provide make, model, and registration, like: 'Add vehicle Ford Focus with reg: ABC123'";
        }
        
        const make = makeModelMatch[1].trim();
        const model = makeModelMatch[2].trim();
        const registration = regMatch[1].trim().toUpperCase();
        const year = yearMatch ? yearMatch[1].trim() : null;
        const color = colorMatch ? colorMatch[1].trim() : null;
        
        try {
          const newVehicle = await addVehicle(
            chatMemory[user_id].lastClientId, 
            make, 
            model, 
            registration,
            year,
            color
          );
          
          // Store in memory for context
          chatMemory[user_id].lastVehicleId = newVehicle.id;
          chatMemory[user_id].lastRegistration = registration;
          
          return `Successfully added new ${make} ${model} with registration ${registration} for client ${chatMemory[user_id].lastClientName}.`;
        } catch (error) {
          console.error('Error adding vehicle:', error);
          return `I had trouble adding the new vehicle. Error: ${error.message}`;
        }
      }
      
      return "For client management, you can add a new client with 'Add client [Name]' or add a vehicle with 'Add vehicle [Make] [Model] with reg: [Registration]'.";
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

    // Main message processing function
    async function processMessage(message: string) {
      console.log('Processing message:', message);
      console.log('Current chat memory:', chatMemory[user_id]);
      
      // Determine query type
      const queryType = determineQueryType(message);
      console.log('Query type:', queryType);
      
      // Store conversation context
      chatMemory[user_id].lastConversationContext = queryType;
      
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
        default:
          return await handleGeneralAutomotiveQuestion(message);
      }
    }

    const response = await processMessage(message);
    console.log('Sending response:', response);

    return new Response(
      JSON.stringify({ response }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
