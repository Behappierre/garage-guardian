
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { format, startOfDay, endOfDay, parseISO } from 'https://esm.sh/date-fns@2.30.0'

export async function handleBookingQuery(
  message: string, 
  userId: string, 
  supabase: SupabaseClient
): Promise<string> {
  const lowerMessage = message.toLowerCase();

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
}

async function getTodayAppointments(supabase: SupabaseClient): Promise<string> {
  const today = new Date();
  const startOfToday = startOfDay(today).toISOString();
  const endOfToday = endOfDay(today).toISOString();

  console.log('Fetching appointments between:', startOfToday, 'and', endOfToday);

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
    .gte('start_time', startOfToday)
    .lte('start_time', endOfToday)
    .order('start_time');

  if (error) {
    console.error('Error fetching appointments:', error);
    return "Sorry, I couldn't fetch today's appointments. Please try again.";
  }

  if (!appointments || appointments.length === 0) {
    return "There are no appointments scheduled for today.";
  }

  return formatAppointmentsList(appointments, "Today's appointments");
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
    return `Sorry, I couldn't fetch appointments for Bay ${bayNumber}. Please try again.`;
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
    return "Sorry, I couldn't fetch cancelled appointments. Please try again.";
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
