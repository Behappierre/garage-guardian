import { createDataService } from "../data-service.ts";

export async function handleBookingQuery(
  message: string, 
  userId: string, 
  supabase: any, 
  entities?: Record<string, string>
): Promise<string> {
  try {
    // Get user's garage ID from the request context if available
    const garageId = supabase.auth.garageId;
    const dataService = createDataService(garageId);
    
    // Check if this is an appointment modification request
    const isModificationRequest = message.toLowerCase().match(/(move|reschedule|change|update|modify)/);
    if (isModificationRequest) {
      console.log("Detected appointment modification request in Gemini handler");
      return handleAppointmentModification(message, userId, supabase, entities);
    }
    
    // If we have extracted entities from our classifier, use them
    if (entities) {
      console.log('Using extracted booking entities:', entities);
      
      // If both a client name and date were provided, we can try to create/find a booking
      if (entities.name && (entities.date || entities.time)) {
        // Try to find the client
        const clientName = entities.name;
        const clients = await dataService.getClients({ search: clientName, limit: 5 });
        
        if (clients.length === 0) {
          return `I couldn't find a client named "${clientName}" in our system. Would you like to add this client first?`;
        }
        
        // If we found multiple matching clients, ask for clarification
        if (clients.length > 1) {
          let response = `I found multiple clients matching "${clientName}". Please specify which one you'd like to book for:\n\n`;
          clients.forEach((client, idx) => {
            response += `${idx + 1}. ${client.first_name} ${client.last_name}`;
            if (client.email) {
              response += ` (${client.email})`;
            }
            response += '\n';
          });
          return response;
        }
        
        // We have a single matching client
        const client = clients[0];
        
        // Try to extract or construct a date for the booking
        let bookingDate: Date | null = null;
        
        if (entities.date) {
          // Parse date string like "tomorrow", "next Monday", "December 15th", etc.
          bookingDate = parseNaturalDate(entities.date);
        } else {
          // Default to tomorrow if only time was provided
          bookingDate = new Date();
          bookingDate.setDate(bookingDate.getDate() + 1);
        }
        
        if (!bookingDate) {
          return `I'm having trouble understanding the date for the booking. Could you please specify a date like "tomorrow" or "next Monday"?`;
        }
        
        // Set the time if provided
        if (entities.time) {
          const timeMatch = entities.time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            
            // Convert to 24-hour format
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
            
            bookingDate.setHours(hours, minutes, 0, 0);
          } else {
            // Default to 9 AM if time format not recognized
            bookingDate.setHours(9, 0, 0, 0);
          }
        } else {
          // Default to 9 AM if no time provided
          bookingDate.setHours(9, 0, 0, 0);
        }
        
        // Check if the client has any vehicles
        const vehicles = await dataService.getVehicles({ clientId: client.id });
        
        if (vehicles.length === 0) {
          return `${client.first_name} ${client.last_name} doesn't have any vehicles registered in our system. Would you like to add a vehicle first?`;
        }
        
        // Format date for display
        const formattedDate = bookingDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
        
        const formattedTime = bookingDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        // Prepare response with booking details
        let response = `I can book an appointment for ${client.first_name} ${client.last_name} on ${formattedDate} at ${formattedTime}.\n\n`;
        
        if (vehicles.length > 1) {
          response += "Which vehicle should I book for?\n\n";
          vehicles.forEach((vehicle, idx) => {
            response += `${idx + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            if (vehicle.license_plate) {
              response += ` (Registration: ${vehicle.license_plate})`;
            }
            response += '\n';
          });
          
          response += "\nPlease reply with the vehicle number to confirm the booking.";
        } else {
          // We have one vehicle, can proceed with booking suggestion
          const vehicle = vehicles[0];
          const serviceType = entities.service || "General Service";
          
          response += `I'll book their ${vehicle.year} ${vehicle.make} ${vehicle.model} for a ${serviceType}.\n\n`;
          response += "Would you like me to create this appointment?";
        }
        
        return response;
      }
      
      // Handle queries about existing bookings on a specific date
      if (entities.date && !entities.name) {
        const date = parseNaturalDate(entities.date);
        
        if (!date) {
          return `I'm having trouble understanding the date you mentioned. Could you please specify a date like "tomorrow" or "next Monday"?`;
        }
        
        // Set up date range for the entire day
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        // Fetch appointments for this date
        const appointments = await dataService.getAppointments({
          startDate: startDate,
          endDate: endDate
        });
        
        // Format date for display
        const formattedDate = startDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
        
        if (appointments.length === 0) {
          return `There are no appointments scheduled for ${formattedDate}. The day is completely free for bookings.`;
        }
        
        // Group appointments by time slot
        const appointmentsByHour: Record<number, any[]> = {};
        
        appointments.forEach(apt => {
          const aptTime = new Date(apt.start_time);
          const hour = aptTime.getHours();
          
          if (!appointmentsByHour[hour]) {
            appointmentsByHour[hour] = [];
          }
          
          appointmentsByHour[hour].push(apt);
        });
        
        // Prepare response
        let response = `Here are the appointments for ${formattedDate}:\n\n`;
        
        // Get all hours and sort them
        const hours = Object.keys(appointmentsByHour).map(Number).sort((a, b) => a - b);
        
        for (const hour of hours) {
          const aptsAtHour = appointmentsByHour[hour];
          const timeStr = new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true
          });
          
          response += `${timeStr}:\n`;
          
          aptsAtHour.forEach((apt, idx) => {
            const client = apt.client;
            const vehicle = apt.vehicle;
            
            response += `- ${client?.first_name || 'Unknown'} ${client?.last_name || 'Client'}`;
            if (vehicle) {
              response += `: ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            }
            response += ` (${apt.service_type})`;
            if (apt.bay) {
              response += ` in Bay ${apt.bay}`;
            }
            response += '\n';
          });
          
          response += '\n';
        }
        
        return response;
      }
    }
    
    // Handle general booking inquiries
    if (message.toLowerCase().includes("available") || message.toLowerCase().includes("free slot")) {
      // Default to showing availability for the next 3 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 3);
      
      // Get available slots
      const slots = await dataService.getAvailableAppointmentSlots(startDate, endDate);
      
      // Group by day for better readability
      const slotsByDay: Record<string, { date: Date, available: boolean }[]> = {};
      
      slots.forEach(slot => {
        const dayKey = slot.date.toISOString().split('T')[0];
        
        if (!slotsByDay[dayKey]) {
          slotsByDay[dayKey] = [];
        }
        
        slotsByDay[dayKey].push(slot);
      });
      
      // Format the response
      let response = "Here are the available appointment slots for the next few days:\n\n";
      
      for (const [dayKey, daySlots] of Object.entries(slotsByDay)) {
        const date = new Date(dayKey);
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
        
        response += `${formattedDate}:\n`;
        
        const availableSlots = daySlots.filter(slot => slot.available);
        
        if (availableSlots.length === 0) {
          response += "- Fully booked\n\n";
          continue;
        }
        
        // Group available slots by hour ranges for better readability
        let currentHour = -1;
        let consecutiveSlots = 0;
        
        availableSlots.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        for (let i = 0; i < availableSlots.length; i++) {
          const slot = availableSlots[i];
          const hour = slot.date.getHours();
          
          if (hour === currentHour + 1) {
            // Consecutive hour
            currentHour = hour;
            consecutiveSlots++;
          } else {
            // Non-consecutive or first hour
            if (consecutiveSlots > 0) {
              // Output the previous range
              const startHour = currentHour - consecutiveSlots + 1;
              const startTime = new Date(2000, 0, 1, startHour).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
              const endTime = new Date(2000, 0, 1, currentHour + 1).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
              
              response += `- ${startTime} to ${endTime}\n`;
            }
            
            // Reset for new range
            currentHour = hour;
            consecutiveSlots = 1;
          }
          
          // Handle the last slot
          if (i === availableSlots.length - 1) {
            const startHour = currentHour - consecutiveSlots + 1;
            const startTime = new Date(2000, 0, 1, startHour).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            const endTime = new Date(2000, 0, 1, currentHour + 1).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            
            response += `- ${startTime} to ${endTime}\n`;
          }
        }
        
        response += '\n';
      }
      
      response += "Would you like to book an appointment in one of these slots?";
      
      return response;
    }
    
    // Default response for booking queries
    return `I can help you book an appointment. Please provide:
1. The client's name
2. The desired date and time
3. The type of service needed

For example: "Book an oil change for John Smith next Tuesday at 10am"`;
  } catch (error) {
    console.error("Error in booking handler:", error);
    return `I'm having trouble processing your booking request at the moment. Please try again later or contact the garage directly.`;
  }
}

// New function to handle appointment modifications
async function handleAppointmentModification(
  message: string, 
  userId: string, 
  supabase: any, 
  entities?: Record<string, string>
): Promise<string> {
  try {
    console.log("Processing appointment modification in Gemini handler with entities:", entities);
    
    // Get user's garage_id
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error("Error fetching user's garage_id:", userError);
      return "I couldn't determine which garage you're working with. Please try again.";
    }
    
    const garageId = userData?.garage_id;
    
    // Extract client name either from entities or using regex
    let clientName = entities?.name;
    if (!clientName) {
      const namePattern = /(?:move|reschedule|change)\s+(?:the\s+)?(?:appointment\s+for\s+)?([A-Za-z\s]+?)(?:\s+booking|\s+appointment|\s+to|\s+from|\s+on|\s+at|$)/i;
      const nameMatch = message.match(namePattern);
      
      if (nameMatch && nameMatch[1]) {
        clientName = nameMatch[1].trim();
      }
    }

    if (!clientName) {
      return "I couldn't identify which appointment you'd like to modify. Please specify the client name, like 'Move Anna Nowak's appointment to March 12th.'";
    }

    console.log(`Looking for client with name: ${clientName}`);
    
    // Split the name and search for first/last name match
    const nameParts = clientName.split(' ');
    let firstName = nameParts[0];
    let lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    // Search for the client with garage_id filter
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email')
      .eq('garage_id', garageId)
      .or(`first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`);
      
    if (clientError) {
      console.error("Error fetching client:", clientError);
      return `I couldn't access the client database. Please try again in a moment.`;
    }
    
    if (!clients || clients.length === 0) {
      return `I couldn't find a client named "${clientName}" in our system. Please check the name and try again.`;
    }

    const client = clients[0];
    console.log(`Found client: ${client.first_name} ${client.last_name}`);

    // Look up the client's appointments
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id, 
        start_time, 
        end_time, 
        service_type,
        bay,
        status,
        vehicle:vehicles(make, model, year),
        notes
      `)
      .eq('client_id', client.id)
      .eq('garage_id', garageId)
      .gte('start_time', new Date().toISOString()) // Only future appointments
      .order('start_time', { ascending: true });
      
    if (appointmentError) {
      console.error('Error looking up appointments:', appointmentError);
      return `I'm having trouble accessing appointment information. Please try again in a moment.`;
    }
    
    if (!appointments || appointments.length === 0) {
      return `I couldn't find any upcoming appointments for ${client.first_name} ${client.last_name}. Would you like to schedule one?`;
    }

    // Get the first upcoming appointment
    const appointmentToModify = appointments[0];
    console.log("Found appointment to modify:", appointmentToModify);
    
    // Extract target date either from entities or using regex
    let targetDateStr = entities?.date;
    if (!targetDateStr) {
      const datePattern = /(?:to|on|for)\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)|tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i;
      const dateMatch = message.match(datePattern);
      
      if (dateMatch && dateMatch[1]) {
        targetDateStr = dateMatch[1];
      }
    }

    if (!targetDateStr) {
      // No specific date found, ask for confirmation to show the appointment details
      const appointmentDate = new Date(appointmentToModify.start_time);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return `I found an appointment for ${client.first_name} ${client.last_name} on ${formattedDate} at ${formattedTime}. How would you like to modify it? Please specify a new date or time.`;
    }

    // Parse the target date
    let targetDate: Date | null = null;
    
    if (targetDateStr.toLowerCase() === 'tomorrow') {
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (targetDateStr.toLowerCase().includes('next')) {
      // Handle "next Monday", "next Tuesday", etc.
      const dayMatch = targetDateStr.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          .indexOf(dayMatch[1].toLowerCase());
        
        targetDate = new Date();
        const currentDay = targetDate.getDay();
        const daysToAdd = (dayOfWeek + 7 - currentDay) % 7 || 7; // If today, go to next week
        
        targetDate.setDate(targetDate.getDate() + daysToAdd);
      }
    } else {
      // Try to parse formats like "12 March", "March 12th", etc.
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      
      // Check for "12 March" format
      const dateFormat1 = targetDateStr.match(/(\d{1,2})\s+([a-z]+)/i);
      // Check for "March 12th" format
      const dateFormat2 = targetDateStr.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
      
      if (dateFormat1) {
        const day = parseInt(dateFormat1[1]);
        const monthText = dateFormat1[2].toLowerCase();
        const monthIndex = monthNames.findIndex(m => monthText.startsWith(m.substring(0, 3)));
        
        if (monthIndex !== -1) {
          targetDate = new Date();
          targetDate.setDate(day);
          targetDate.setMonth(monthIndex);
        }
      } else if (dateFormat2) {
        const monthText = dateFormat2[1].toLowerCase();
        const day = parseInt(dateFormat2[2]);
        const monthIndex = monthNames.findIndex(m => monthText.startsWith(m.substring(0, 3)));
        
        if (monthIndex !== -1) {
          targetDate = new Date();
          targetDate.setDate(day);
          targetDate.setMonth(monthIndex);
        }
      }
    }

    if (!targetDate) {
      return `I'm having trouble understanding the date "${targetDateStr}". Please use a format like "March 12th" or "tomorrow".`;
    }

    // Extract target time or use the same time as the original appointment
    let targetTime = entities?.time;
    const originalAppointmentDate = new Date(appointmentToModify.start_time);
    
    // If no new time specified, use the same time as original appointment
    if (!targetTime) {
      if (message.toLowerCase().includes('same time')) {
        // Keep the same time, just update the date
        targetDate.setHours(originalAppointmentDate.getHours());
        targetDate.setMinutes(originalAppointmentDate.getMinutes());
      }
    } else {
      // Parse the time if specified
      const timeMatch = targetTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        
        // Convert to 24-hour format
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        targetDate.setHours(hours, minutes, 0, 0);
      }
    }

    // Format dates for display
    const originalDate = originalAppointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const originalTime = originalAppointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const newDate = targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const newTime = targetDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Calculate the end time (assume same duration as original appointment)
    const originalDuration = new Date(appointmentToModify.end_time).getTime() - originalAppointmentDate.getTime();
    const newEndTime = new Date(targetDate.getTime() + originalDuration);

    // Check if the message contains confirmation phrases
    const isConfirmation = message.toLowerCase().match(/\b(yes|confirm|correct|right|that's right|exactly)\b/);
    
    if (isConfirmation) {
      // This is a confirmation of a previous modification request, so actually update the appointment
      const { data, error } = await supabase
        .from('appointments')
        .update({
          start_time: targetDate.toISOString(),
          end_time: newEndTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentToModify.id)
        .select();
        
      if (error) {
        console.error("Error updating appointment:", error);
        return `I'm having trouble updating the appointment. Please try again later or contact support.`;
      }
      
      return `I've rescheduled ${client.first_name} ${client.last_name}'s appointment to ${newDate} at ${newTime}. 
The appointment details remain the same: ${appointmentToModify.service_type} for ${appointmentToModify.vehicle?.make} ${appointmentToModify.vehicle?.model} in bay '${appointmentToModify.bay}'. 
Would you like me to notify ${client.first_name} about this change?`;
    } else {
      // Ask for confirmation before modifying
      return `I'm processing your request to move ${client.first_name} ${client.last_name}'s appointment from ${originalDate} at ${originalTime} to ${newDate} at ${newTime}. Is this correct?`;
    }
  } catch (err) {
    console.error('Error in appointment modification handler:', err);
    return `I'm having trouble processing your request to modify the appointment. Please try again with different wording or contact support.`;
  }
}

// Helper function to parse natural language dates
function parseNaturalDate(dateString: string): Date | null {
  const now = new Date();
  
  // Handle "tomorrow"
  if (dateString.toLowerCase().includes("tomorrow")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  // Handle "next Monday", "next Tuesday", etc.
  const nextDayMatch = dateString.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (nextDayMatch) {
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      .indexOf(nextDayMatch[1].toLowerCase());
    
    const result = new Date(now);
    const currentDay = result.getDay();
    const daysToAdd = (dayOfWeek + 7 - currentDay) % 7 || 7; // If today, go to next week
    
    result.setDate(result.getDate() + daysToAdd);
    return result;
  }
  
  // Try to parse more complex date formats
  try {
    // Handle month and day (e.g., "December 15th")
    const dateMatch = dateString.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
    
    if (dateMatch) {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.findIndex(m => dateMatch[1].toLowerCase().startsWith(m.substring(0, 3)));
      
      if (monthIndex !== -1) {
        const day = parseInt(dateMatch[2]);
        const year = now.getFullYear();
        
        // If the date is in the past, assume next year
        const result = new Date(year, monthIndex, day);
        if (result < now) {
          result.setFullYear(year + 1);
        }
        
        return result;
      }
    }
    
    // If all else fails, try native Date parsing (not very reliable for natural language)
    const result = new Date(dateString);
    return isNaN(result.getTime()) ? null : result;
  } catch (error) {
    return null;
  }
}
