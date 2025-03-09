// Handles booking requests and appointment queries
export async function handleBookingRequest(
  message: string, 
  supabase: any, 
  userId: string,
  entities?: Record<string, string>
): Promise<string> {
  console.log('Processing booking request:', message);
  console.log('Extracted entities:', entities);
  
  try {
    // Get user's garage_id
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error("Error fetching user's garage_id:", userError);
      throw new Error("Unable to determine user's garage");
    }
    
    const userGarageId = userData?.garage_id;
    console.log('User garage ID for booking:', userGarageId);
    
    // Find client by name if entity is available
    if (entities?.name) {
      const clientName = entities.name;
      console.log(`Looking for client with name: ${clientName}`);
      
      // Split the name and search for first/last name match
      const nameParts = clientName.split(' ');
      let firstName = nameParts[0];
      let lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      // Search for the client with garage_id filter
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .eq('garage_id', userGarageId)
        .or(`first_name.ilike.${firstName}%,last_name.ilike.${lastName}%`);
        
      if (clientError) {
        console.error("Error fetching client:", clientError);
        throw new Error("Failed to find client information");
      }
      
      if (clients && clients.length > 0) {
        const client = clients[0];
        console.log(`Found client: ${client.first_name} ${client.last_name}`);
        
        // Try to extract date from entities or message
        let startTime: Date | null = null;
        let endTime: Date | null = null;
        
        if (entities?.date) {
          // Parse date from entity
          // This is a simplified version - in production you'd want more robust date parsing
          if (entities.date.toLowerCase() === 'tomorrow') {
            startTime = new Date();
            startTime.setDate(startTime.getDate() + 1);
            startTime.setHours(9, 0, 0, 0); // Default to 9 AM
          } else {
            // TODO: Add more sophisticated date parsing
            startTime = new Date();
            startTime.setDate(startTime.getDate() + 1);
            startTime.setHours(9, 0, 0, 0); // Default to 9 AM tomorrow
          }
        } else {
          // No date entity, use default of tomorrow
          startTime = new Date();
          startTime.setDate(startTime.getDate() + 1);
          startTime.setHours(9, 0, 0, 0); // Default to 9 AM
        }
        
        // Set end time 1 hour after start time
        if (startTime) {
          endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 1);
        } else {
          throw new Error("Could not determine appointment date");
        }
        
        // Get the client's vehicles
        const { data: vehicles, error: vehicleError } = await supabase
          .from('vehicles')
          .select('id, make, model, year')
          .eq('client_id', client.id)
          .eq('garage_id', userGarageId);
          
        if (vehicleError) {
          console.error("Error fetching vehicles:", vehicleError);
          throw new Error("Failed to find vehicle information");
        }
        
        if (!vehicles || vehicles.length === 0) {
          return `I found ${client.first_name} ${client.last_name} in our system, but they don't have any vehicles registered. Please add a vehicle for this client before booking an appointment.`;
        }
        
        // Extract service type
        let serviceType = "General Service";
        if (entities?.service) {
          serviceType = entities.service;
        }
        
        // Create the appointment
        const appointmentData = {
          client_id: client.id,
          vehicle_id: vehicles[0].id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          service_type: serviceType,
          notes: `Booked via AI assistant: ${message}`,
          status: 'scheduled',
          bay: assignBay(startTime),
          garage_id: userGarageId
        };
        
        console.log("Creating appointment with data:", appointmentData);
        
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert([appointmentData])
          .select()
          .single();
          
        if (appointmentError) {
          console.error("Error creating appointment:", appointmentError);
          throw new Error("Failed to create appointment");
        }
        
        const formattedDate = startTime.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        return `Booking is confirmed for ${client.first_name} ${client.last_name} on ${formattedDate}. 
The appointment has been added to the system. 
A ${vehicles[0].make} ${vehicles[0].model} has been linked to this booking.
Service type: ${serviceType}
Bay: ${appointmentData.bay}`;
      } else {
        return `I couldn't find a client named "${clientName}" in our system. Would you like to add this client?`;
      }
    }
    
    // Default response if no specific client was found
    return "I can help you book an appointment. Please provide the client name and preferred date and time.";
  } catch (error) {
    console.error('Error in booking handler:', error);
    return `I encountered an error while trying to book the appointment: ${error.message}. Please try again or contact support.`;
  }
}

// Helper function to assign a bay based on service type and date
function assignBay(date: Date): string {
  // Simple round-robin assignment between bay1 and bay2
  const hour = date.getHours();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Use MOT bay for weekday mornings
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour < 12) {
    return "mot";
  }
  
  // Otherwise alternate between bay1 and bay2
  return date.getDate() % 2 === 0 ? "bay1" : "bay2";
}

// Function to handle appointment queries
export async function handleAppointmentQuery(
  message: string, 
  supabase: any, 
  garageId: string | null
): Promise<string> {
  // Determine the time range for the query
  const timeRange = determineTimeRange(message);
  
  if (!timeRange) {
    return "I can check the appointment schedule for you. Please specify when you'd like to check (today, tomorrow, next week, etc).";
  }
  
  try {
    console.log(`Querying appointments from ${timeRange.startTime.toISOString()} to ${timeRange.endTime.toISOString()}`);
    console.log(`Using garage_id filter: ${garageId}`);
    
    // Query appointments in the specified time range with garage_id filter
    const query = supabase
      .from('appointments')
      .select(`
        *,
        client:clients(*),
        vehicle:vehicles(*)
      `)
      .gte('start_time', timeRange.startTime.toISOString())
      .lt('start_time', timeRange.endTime.toISOString())
      .order('start_time', { ascending: true });
      
    // Add garage filter if garage_id is available
    if (garageId) {
      query.eq('garage_id', garageId);
    } else {
      console.warn('No garage_id available for filtering appointments');
    }
    
    const { data: appointments, error: appointmentsError } = await query;
      
    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
      return "I'm having trouble accessing the appointment database right now. Please try again in a moment.";
    }
    
    console.log(`Found ${appointments?.length || 0} appointments for query:`, message);
    
    if (!appointments || appointments.length === 0) {
      return `No appointments found for ${timeRange.description}.`;
    }
    
    // Format the response
    let response = `Here are the appointments for ${timeRange.description}:\n\n`;
    
    appointments.forEach((appointment: any, index: number) => {
      const startTime = new Date(appointment.start_time);
      const formattedTime = startTime.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const client = appointment.client || { first_name: 'Unknown', last_name: 'Client' };
      const vehicle = appointment.vehicle || { make: 'Unknown', model: 'Vehicle' };
      
      response += `${index + 1}. ${formattedTime} - ${client.first_name} ${client.last_name}\n`;
      response += `   Service: ${appointment.service_type}\n`;
      response += `   Vehicle: ${vehicle.make} ${vehicle.model}\n`;
      response += `   Bay: ${appointment.bay || 'Not assigned'}\n`;
      response += `   Status: ${appointment.status}\n\n`;
    });
    
    return response;
    
  } catch (error) {
    console.error("Error in handleAppointmentQuery:", error);
    return "I encountered an error while checking the appointment schedule. Please try again.";
  }
}

// Helper function to determine time range from query
function determineTimeRange(message: string): { startTime: Date, endTime: Date, description: string } | null {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const today = new Date(now);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  
  // Check for specific patterns
  if (/\btomorrow\b/i.test(message)) {
    const startTime = new Date(tomorrow);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(23, 59, 59, 999);
    
    return { 
      startTime, 
      endTime,
      description: `tomorrow (${startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })})`
    };
  }
  
  if (/\btoday\b/i.test(message)) {
    const startTime = new Date(today);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(today);
    endTime.setHours(23, 59, 59, 999);
    
    return { 
      startTime, 
      endTime,
      description: "today"
    };
  }
  
  if (/\bnext week\b/i.test(message)) {
    const startTime = new Date(tomorrow);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(nextWeek);
    endTime.setHours(23, 59, 59, 999);
    
    return { 
      startTime, 
      endTime,
      description: "next week"
    };
  }
  
  // Default to tomorrow if no specific timeframe is mentioned but query seems to be about appointments
  if (/\bappointments?\b|\bbookings?\b|\bschedule\b/i.test(message)) {
    const startTime = new Date(tomorrow);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(23, 59, 59, 999);
    
    return { 
      startTime, 
      endTime,
      description: `tomorrow (${startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })})`
    };
  }
  
  return null;
}
