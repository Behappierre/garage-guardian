
import { supabase } from "../db.ts";
import { DBClient, findClientByName } from "./client.ts";
import { format, parse, addDays, getDay, nextDay, addHours } from "date-fns";

// Helper function to extract client name from a message
const extractClientName = (message: string): string | null => {
  // Look for patterns like "book John Smith" or "appointment for Jane Doe"
  const bookingPatterns = [
    /book\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:in|for)/i,
    /appointment\s+for\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
    /schedule\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:in|for)/i,
    /book\s+(?:an\s+)?appointment\s+for\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
    /can\s+you\s+book\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
  ];

  for (const pattern of bookingPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

// Helper function to extract date information
const extractDate = (message: string): Date | null => {
  const today = new Date();
  
  // Check for specific day mentions
  const dayPatterns = {
    today: 0,
    tomorrow: 1,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };

  // Look for day names
  for (const [day, dayNum] of Object.entries(dayPatterns)) {
    const pattern = new RegExp(`(?:for|on|this|next)\\s+${day}`, "i");
    if (pattern.test(message)) {
      if (day === "today") {
        return today;
      } else if (day === "tomorrow") {
        return addDays(today, 1);
      } else {
        const targetDay = dayNum as number;
        const currentDay = getDay(today);
        let daysToAdd = targetDay - currentDay;
        
        // If looking for next week, add 7 days
        if (daysToAdd <= 0 || message.toLowerCase().includes("next")) {
          daysToAdd += 7;
        }
        
        return addDays(today, daysToAdd);
      }
    }
  }

  // Look for specific dates like "June 15" or "15th of June"
  const datePattern = /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)|([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
  const dateMatch = message.match(datePattern);
  
  if (dateMatch) {
    let day, month;
    if (dateMatch[1] && dateMatch[2]) {
      day = parseInt(dateMatch[1]);
      month = dateMatch[2];
    } else {
      day = parseInt(dateMatch[4]);
      month = dateMatch[3];
    }
    
    try {
      // Parse the date
      const dateString = `${day} ${month} ${today.getFullYear()}`;
      const parsedDate = parse(dateString, "d MMMM yyyy", new Date());
      
      // If the date is in the past, maybe they meant next year
      if (parsedDate < today) {
        parsedDate.setFullYear(today.getFullYear() + 1);
      }
      
      return parsedDate;
    } catch (error) {
      console.error("Error parsing date:", error);
      return null;
    }
  }

  return null;
};

// Helper function to extract time information
const extractTime = (message: string): string | null => {
  // Look for patterns like "at 2pm", "at 14:30", "at 2:30 pm"
  const timePatterns = [
    /at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i,
    /(\d{1,2}):?(\d{2})?\s*(am|pm)/i,
  ];

  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = match[2] ? parseInt(match[2]) : 0;
      const meridiem = match[3]?.toLowerCase();

      // Handle 12-hour format
      if (meridiem === "pm" && hour < 12) {
        hour += 12;
      } else if (meridiem === "am" && hour === 12) {
        hour = 0;
      }

      // Format time as HH:MM
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    }
  }

  return null;
};

// Helper function to extract duration information
const extractDuration = (message: string): number | null => {
  // Look for patterns like "for 1 hour", "for 30 minutes", "2 hours"
  const durationPatterns = [
    /for\s+(\d+)\s+hour(?:s)?/i,
    /(\d+)\s+hour(?:s)?/i,
    /for\s+(\d+):(\d+)/i, // 1:30 format
    /for\s+(\d+)\s+minute(?:s)?/i,
    /(\d+)\s+minute(?:s)?/i,
  ];

  for (const pattern of durationPatterns) {
    const match = message.match(pattern);
    if (match) {
      if (pattern.source.includes("hour")) {
        // Convert hours to minutes
        return parseInt(match[1]) * 60;
      } else if (pattern.source.includes(":")) {
        // Handle 1:30 format (hours:minutes)
        return parseInt(match[1]) * 60 + parseInt(match[2]);
      } else {
        // Minutes directly
        return parseInt(match[1]);
      }
    }
  }

  // Default duration (1 hour)
  return 60;
};

// Helper function to get the next available times
const getNextAvailableTimes = async (date: Date): Promise<string[]> => {
  // Format the date to a string for database query
  const dateStr = format(date, "yyyy-MM-dd");
  
  // Business hours: 9 AM to 5 PM
  const businessHours = {
    start: 9,
    end: 17,
  };

  // Get all appointments for the given date
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .gte("start_time", `${dateStr}T00:00:00`)
    .lt("start_time", `${dateStr}T23:59:59`)
    .neq("status", "cancelled");

  if (error) {
    console.error("Error fetching appointments:", error);
    return [];
  }

  // Create a map of busy times
  const busyTimes: { [key: string]: boolean } = {};
  appointments?.forEach((appointment) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    
    // Mark every 30-minute slot as busy
    let current = new Date(start);
    while (current < end) {
      const timeSlot = format(current, "HH:mm");
      busyTimes[timeSlot] = true;
      current = addMinutes(current, 30);
    }
  });

  // Generate available times
  const availableTimes: string[] = [];
  let currentHour = businessHours.start;
  
  while (currentHour < businessHours.end) {
    for (const minutes of [0, 30]) {
      const timeSlot = `${currentHour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      if (!busyTimes[timeSlot]) {
        availableTimes.push(timeSlot);
      }
    }
    currentHour++;
  }

  return availableTimes;
};

// Helper function to add minutes to a date
const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

// Function to create an appointment
const createAppointment = async (
  client: DBClient,
  date: Date,
  time: string,
  durationMinutes: number
): Promise<{ success: boolean; appointmentId?: string; error?: string }> => {
  try {
    // Parse the time
    const [hours, minutes] = time.split(":").map(Number);
    
    // Set start and end times
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = addMinutes(startTime, durationMinutes);
    
    // Check if client has a vehicle
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id")
      .eq("client_id", client.id)
      .limit(1);
    
    // Create the appointment
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        client_id: client.id,
        vehicle_id: vehicles && vehicles.length > 0 ? vehicles[0].id : null,
        service_type: "Service Appointment",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "scheduled",
        notes: `Appointment created via chat assistant`
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating appointment:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true, appointmentId: data.id };
  } catch (error) {
    console.error("Error in createAppointment:", error);
    return { success: false, error: "Failed to create appointment" };
  }
};

// Booking state management
type BookingState = {
  clientId: string | null;
  clientName: string | null;
  date: Date | null;
  time: string | null;
  duration: number | null;
  stage: "initial" | "client_confirmation" | "date_selection" | "time_selection" | "duration_selection" | "confirmation" | "complete";
};

const bookingStates: Map<string, BookingState> = new Map();

export const handleBookingQuery = async (
  message: string,
  userId: string,
  context: any
): Promise<string> => {
  try {
    console.log(`Processing booking query: ${message}`);
    
    // Get or initialize booking state
    let state = bookingStates.get(userId) || {
      clientId: null,
      clientName: null,
      date: null,
      time: null,
      duration: null,
      stage: "initial",
    };
    
    // Process based on current state
    switch (state.stage) {
      case "initial":
        // Extract client name from message
        const clientName = extractClientName(message);
        if (!clientName) {
          state.stage = "client_confirmation";
          bookingStates.set(userId, state);
          return "I'd be happy to book an appointment. Could you please provide the client's name?";
        }
        
        // Try to find the client
        const client = await findClientByName(clientName);
        if (!client) {
          state.clientName = clientName;
          state.stage = "client_confirmation";
          bookingStates.set(userId, state);
          return `I couldn't find a client named ${clientName} in our system. Could you please check the name and try again?`;
        }
        
        // Client found, store details
        state.clientId = client.id;
        state.clientName = `${client.first_name} ${client.last_name}`;
        
        // Extract date
        const date = extractDate(message);
        if (!date) {
          state.stage = "date_selection";
          bookingStates.set(userId, state);
          return `I found ${state.clientName} in our system. What day would you like to book the appointment for?`;
        }
        
        state.date = date;
        
        // Extract time
        const time = extractTime(message);
        if (!time) {
          state.stage = "time_selection";
          bookingStates.set(userId, state);
          
          // Get available times
          const availableTimes = await getNextAvailableTimes(state.date);
          if (availableTimes.length === 0) {
            return `I found ${state.clientName} and you want to book for ${format(state.date, "EEEE, MMMM do")}. What time would you like? Our business hours are from 9 AM to 5 PM.`;
          }
          
          return `I found ${state.clientName} and you want to book for ${format(state.date, "EEEE, MMMM do")}. What time would you like? Here are some available slots: ${availableTimes.slice(0, 5).join(", ")}`;
        }
        
        state.time = time;
        
        // Extract duration
        const duration = extractDuration(message);
        state.duration = duration;
        
        // Ready for confirmation
        state.stage = "confirmation";
        bookingStates.set(userId, state);
        
        return `I'm ready to book an appointment for ${state.clientName} on ${format(state.date, "EEEE, MMMM do")} at ${state.time} for ${state.duration === 60 ? "1 hour" : `${state.duration} minutes`}. Should I go ahead and book this?`;
      
      case "client_confirmation":
        // User should be providing client name in response
        const clientNameFromResponse = message.trim();
        
        // Try to find the client
        const clientFromResponse = await findClientByName(clientNameFromResponse);
        if (!clientFromResponse) {
          return `I couldn't find a client named ${clientNameFromResponse} in our system. Could you please check the name and try again?`;
        }
        
        // Client found, store details
        state.clientId = clientFromResponse.id;
        state.clientName = `${clientFromResponse.first_name} ${clientFromResponse.last_name}`;
        state.stage = "date_selection";
        bookingStates.set(userId, state);
        
        return `Thanks! I found ${state.clientName} in our system. What day would you like to book the appointment for?`;
      
      case "date_selection":
        // User should be providing date in response
        const dateFromResponse = extractDate(message);
        
        if (!dateFromResponse) {
          return "I'm sorry, I couldn't understand that date. Could you please specify a day like 'Monday', 'tomorrow', or a specific date like 'June 15'?";
        }
        
        state.date = dateFromResponse;
        state.stage = "time_selection";
        bookingStates.set(userId, state);
        
        // Get available times
        const availableTimes = await getNextAvailableTimes(state.date);
        if (availableTimes.length === 0) {
          return `Great! You want to book for ${format(state.date, "EEEE, MMMM do")}. What time would you like? Our business hours are from 9 AM to 5 PM.`;
        }
        
        return `Great! You want to book for ${format(state.date, "EEEE, MMMM do")}. What time would you like? Here are some available slots: ${availableTimes.slice(0, 5).join(", ")}`;
      
      case "time_selection":
        // User should be providing time in response
        const timeFromResponse = extractTime(message);
        
        if (!timeFromResponse) {
          return "I'm sorry, I couldn't understand that time. Could you please specify a time like '2 PM' or '14:30'?";
        }
        
        state.time = timeFromResponse;
        state.stage = "duration_selection";
        bookingStates.set(userId, state);
        
        return `Got it! How long should the appointment be? The default is 1 hour.`;
      
      case "duration_selection":
        // User should be providing duration in response
        const durationFromResponse = extractDuration(message);
        
        if (!durationFromResponse) {
          state.duration = 60; // Default to 1 hour
        } else {
          state.duration = durationFromResponse;
        }
        
        state.stage = "confirmation";
        bookingStates.set(userId, state);
        
        return `I'm ready to book an appointment for ${state.clientName} on ${format(state.date!, "EEEE, MMMM do")} at ${state.time} for ${state.duration === 60 ? "1 hour" : `${state.duration} minutes`}. Should I go ahead and book this?`;
      
      case "confirmation":
        // Check if the user confirmed
        if (message.toLowerCase().includes("yes") || 
            message.toLowerCase().includes("yeah") || 
            message.toLowerCase().includes("confirm") ||
            message.toLowerCase().includes("book it") ||
            message.toLowerCase().includes("go ahead")) {
          
          // Create the appointment
          const result = await createAppointment(
            { id: state.clientId!, first_name: state.clientName!.split(" ")[0], last_name: state.clientName!.split(" ")[1] } as DBClient,
            state.date!,
            state.time!,
            state.duration!
          );
          
          if (result.success) {
            state.stage = "complete";
            bookingStates.set(userId, state);
            
            return `Great! The appointment for ${state.clientName} has been booked for ${format(state.date!, "EEEE, MMMM do")} at ${state.time}. Is there anything else you'd like assistance with?`;
          } else {
            return `I'm sorry, there was an error booking the appointment: ${result.error}. Would you like to try again?`;
          }
        } else {
          // Reset booking state
          bookingStates.delete(userId);
          return "I've cancelled the booking process. Let me know if you'd like to book another appointment.";
        }
      
      case "complete":
        // Reset booking state for new requests
        bookingStates.delete(userId);
        return handleBookingQuery(message, userId, context);
    }
  } catch (error) {
    console.error("Error handling booking query:", error);
    bookingStates.delete(userId);
    return "I apologize, but I encountered an error while processing your booking request. Please try again.";
  }
};
