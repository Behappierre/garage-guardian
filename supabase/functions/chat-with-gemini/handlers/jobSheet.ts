export async function handleJobSheetQuery(
  message: string, 
  supabase: any, 
  garageId?: string,
  entities?: Record<string, string>
) {
  console.log('Handling job sheet query:', message);
  console.log('Garage ID:', garageId);
  
  // If we have extracted entities from our classifier, use them
  if (entities) {
    console.log('Using extracted jobSheet entities:', entities);
    // You can use entities.jobId, entities.issue, etc.
  }
  
  try {
    // Check if the message contains a job ticket ID or number
    const jobIdMatch = message.match(/ticket\s+(?:number|id|#)?\s*([A-Z0-9-]+)/i) || 
                       message.match(/job\s+(?:number|id|#)?\s*([A-Z0-9-]+)/i);
    
    if (jobIdMatch && jobIdMatch[1]) {
      // If a specific job ticket ID is mentioned, look it up
      const jobId = jobIdMatch[1];
      console.log('Looking up job ticket with ID:', jobId);
      
      const { data: jobTicket, error } = await supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients(id, first_name, last_name, email, phone),
          vehicle:vehicles(id, make, model, year, license_plate),
          technician:profiles(id, first_name, last_name)
        `)
        .eq('id', jobId)
        .single();
      
      if (error) {
        console.error('Error fetching job ticket:', error);
        return `I couldn't find a job ticket with ID ${jobId}. Please check the ID and try again.`;
      }
      
      if (jobTicket) {
        return formatJobTicketResponse(jobTicket);
      }
    }
    
    // If no specific job ticket ID is mentioned, check for status queries
    if (message.toLowerCase().includes('status') || message.toLowerCase().includes('progress')) {
      // Get recent job tickets for the garage
      const query = supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients(id, first_name, last_name),
          vehicle:vehicles(id, make, model, license_plate),
          technician:profiles(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Add garage filter if available
      if (garageId) {
        query.eq('garage_id', garageId);
      }
      
      const { data: jobTickets, error } = await query;
      
      if (error) {
        console.error('Error fetching job tickets:', error);
        return "I'm sorry, I couldn't retrieve the job ticket information at this time.";
      }
      
      if (jobTickets && jobTickets.length > 0) {
        let response = "Here are the most recent job tickets:\n\n";
        
        jobTickets.forEach((ticket, index) => {
          const clientName = ticket.client ? `${ticket.client.first_name} ${ticket.client.last_name}` : 'Unknown Client';
          const vehicleInfo = ticket.vehicle ? `${ticket.vehicle.make} ${ticket.vehicle.model}` : 'Unknown Vehicle';
          
          response += `${index + 1}. Job Ticket: ${ticket.id}\n`;
          response += `   Customer: ${clientName}\n`;
          response += `   Vehicle: ${vehicleInfo}\n`;
          response += `   Status: ${ticket.status}\n`;
          response += `   Created: ${new Date(ticket.created_at).toLocaleDateString()}\n\n`;
        });
        
        return response;
      } else {
        return "I couldn't find any recent job tickets.";
      }
    }
    
    // Default response if no specific query is detected
    return "I can help you look up job tickets by ID or check the status of recent tickets. Please provide more details about what you're looking for.";
    
  } catch (error) {
    console.error('Error in handleJobSheetQuery:', error);
    return "I'm sorry, I encountered an error while processing your job ticket query.";
  }
}

function formatJobTicketResponse(jobTicket) {
  const clientName = jobTicket.client 
    ? `${jobTicket.client.first_name} ${jobTicket.client.last_name}` 
    : 'Unknown Client';
  
  const vehicleInfo = jobTicket.vehicle 
    ? `${jobTicket.vehicle.year} ${jobTicket.vehicle.make} ${jobTicket.vehicle.model}` 
    : 'Unknown Vehicle';
  
  const technicianName = jobTicket.technician 
    ? `${jobTicket.technician.first_name} ${jobTicket.technician.last_name}` 
    : 'Unassigned';
  
  let response = `Job Ticket: ${jobTicket.id}\n\n`;
  response += `Customer: ${clientName}\n`;
  response += `Vehicle: ${vehicleInfo}`;
  
  if (jobTicket.vehicle?.license_plate) {
    response += ` (${jobTicket.vehicle.license_plate})`;
  }
  
  response += `\n\nService Details: ${jobTicket.description || 'No details provided'}\n`;
  response += `Status: ${jobTicket.status}\n`;
  response += `Priority: ${jobTicket.priority}\n`;
  response += `Technician: ${technicianName}\n`;
  
  if (jobTicket.notes) {
    response += `\nNotes: ${jobTicket.notes}\n`;
  }
  
  response += `\nCreated: ${new Date(jobTicket.created_at).toLocaleDateString()}`;
  
  if (jobTicket.completed_at) {
    response += `\nCompleted: ${new Date(jobTicket.completed_at).toLocaleDateString()}`;
  }
  
  return response;
}
