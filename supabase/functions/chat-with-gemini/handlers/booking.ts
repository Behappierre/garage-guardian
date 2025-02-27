
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { format, startOfDay, endOfDay, parseISO } from 'https://esm.sh/date-fns@2.30.0'

export async function handleBookingQuery(
  message: string, 
  userId: string, 
  supabase: SupabaseClient
): Promise<string> {
  const lowerMessage = message.toLowerCase();

  try {
    // Handle different types of appointment queries
    if (lowerMessage.includes('today')) {
      return await getTodayAppointments(supabase);
    }
    
    if (lowerMessage.includes('bay')) {
      const bayNumber = message.match(/bay\s*(\d+)/i)?.[1];
      if (bayNumber) {
        return await getBayAppointments(supabase, bayNumber);
      }
    }
    
    if (lowerMessage.includes('cancelled')) {
      return await getCancelledAppointments(supabase);
    }
    
    // Default response for booking-related queries
    return "I can help you with appointments. Try asking:\n" +
           "- Show me all appointments for today\n" +
           "- What appointments are in Bay [number]?\n" +
           "- Show cancelled appointments\n" +
           "- Book a new appointment";
  } catch (error) {
    console.error('Error in handleBookingQuery:', error);
    return "I apologize, but I encountered an error while fetching the appointments. Please try again.";
  }
}

async function getTodayAppointments(supabase: SupabaseClient): Promise<string> {
  try {
    const today = new Date();
    const startTime = startOfDay(today).toISOString();
    const endTime = endOfDay(today).toISOString();

    console.log('Query parameters:', {
      startTime,
      endTime,
      currentTime: new Date().toISOString()
    });

    // First, let's check if we can query the table at all
    const { data: testData, error: testError } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('Test query error:', testError);
      throw new Error('Failed to access appointments table');
    }

    // Now perform the actual query
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        service_type,
        status,
        bay,
        client:clients(first_name, last_name),
        vehicle:vehicles(make, model, year)
      `)
      .gte('start_time', startTime)
      .lt('end_time', endTime)
      .order('start_time');

    if (error) {
      console.error('Appointment query error:', error);
      throw error;
    }

    if (!appointments || appointments.length === 0) {
      return "There are no appointments scheduled for today.";
    }

    return formatAppointmentsList(appointments, "Today's appointments");
  } catch (error) {
    console.error('Error in getTodayAppointments:', error);
    throw error;
  }
}

async function getBayAppointments(supabase: SupabaseClient, bayNumber: string): Promise<string> {
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      service_type,
      status,
      bay,
      client:clients(first_name, last_name),
      vehicle:vehicles(make, model, year)
    `)
    .eq('bay', `Bay ${bayNumber}`)
    .gte('start_time', new Date().toISOString())
    .order('start_time');

  if (error) {
    console.error('Error fetching bay appointments:', error);
    throw error;
  }

  if (!appointments || appointments.length === 0) {
    return `There are no appointments scheduled for Bay ${bayNumber}.`;
  }

  return formatAppointmentsList(appointments, `Appointments in Bay ${bayNumber}`);
}

async function getCancelledAppointments(supabase: SupabaseClient): Promise<string> {
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      service_type,
      status,
      bay,
      client:clients(first_name, last_name),
      vehicle:vehicles(make, model, year)
    `)
    .eq('status', 'cancelled')
    .order('start_time');

  if (error) {
    console.error('Error fetching cancelled appointments:', error);
    throw error;
  }

  if (!appointments || appointments.length === 0) {
    return "There are no cancelled appointments.";
  }

  return formatAppointmentsList(appointments, "Cancelled appointments");
}

function formatAppointmentsList(appointments: any[], title: string): string {
  let response = `${title}:\n\n`;
  
  appointments.forEach((apt) => {
    const clientName = apt.client 
      ? `${apt.client.first_name} ${apt.client.last_name}`
      : 'No client assigned';
    
    const vehicleInfo = apt.vehicle
      ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`
      : 'No vehicle assigned';
    
    const startTime = format(parseISO(apt.start_time), 'h:mm a');
    const endTime = format(parseISO(apt.end_time), 'h:mm a');
    
    response += `Time: ${startTime} - ${endTime}\n`;
    response += `Client: ${clientName}\n`;
    response += `Vehicle: ${vehicleInfo}\n`;
    response += `Service: ${apt.service_type}\n`;
    if (apt.bay) response += `Bay: ${apt.bay}\n`;
    response += `Status: ${apt.status}\n\n`;
  });

  return response.trim();
}
