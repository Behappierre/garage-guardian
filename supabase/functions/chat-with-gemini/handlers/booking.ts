
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handleBookingRequest(message: string, supabaseClient: any) {
  console.log('Processing booking request:', message);

  try {
    // Check if the message is related to booking
    const isBookingRequest = /\b(book|schedule|appointment)\b/i.test(message);
    
    if (!isBookingRequest) {
      console.log('Not a booking request');
      return null;
    }

    // Get available time slots for the next 7 days
    const { data: existingAppointments, error: appointmentsError } = await supabaseClient
      .from('appointments')
      .select('*')
      .gte('start_time', new Date().toISOString())
      .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      throw appointmentsError;
    }

    // Get working hours (assuming 9 AM to 5 PM)
    const workingHours = {
      start: 9,
      end: 17
    };

    // Generate available time slots
    const availableSlots = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, 0, 0, 0);
        
        // Check if slot is already booked
        const isBooked = existingAppointments.some(appointment => {
          const appointmentTime = new Date(appointment.start_time);
          return appointmentTime.getTime() === slotTime.getTime();
        });
        
        if (!isBooked) {
          availableSlots.push(slotTime);
        }
      }
    }

    if (availableSlots.length === 0) {
      return "I apologize, but I don't see any available appointment slots in the next 7 days. Please contact our service desk directly for assistance with scheduling.";
    }

    // Format the response with available slots
    const formattedSlots = availableSlots
      .slice(0, 5) // Show only first 5 available slots
      .map(slot => slot.toLocaleString('en-US', { 
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }))
      .join('\n');

    return `I found several available appointment slots:\n\n${formattedSlots}\n\nWould you like me to help you book one of these times? Just let me know which time works best for you, and I'll help you schedule it.`;

  } catch (error) {
    console.error('Error in handleBookingRequest:', error);
    return "I apologize, but I'm having trouble accessing the scheduling system right now. Please try again in a moment or contact our service desk directly.";
  }
}
