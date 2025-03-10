
export async function handleJobSheetQuery(
  message: string, 
  supabase: any, 
  garageId?: string,
  entities?: Record<string, string>
) {
  console.log('Handling job sheet query:', message);
  console.log('Garage ID:', garageId);
  console.log('Extracted entities:', entities);
  
  try {
    // First check if this is a job listing request
    if (isJobListingRequest(message)) {
      return await handleJobListingRequest(message, supabase, garageId);
    }
    
    // Check if the message contains a job ticket ID or number
    let jobId = entities?.jobId;
    
    if (!jobId) {
      const jobIdMatch = message.match(/ticket\s+(?:number|id|#)?\s*([A-Z0-9-]+)/i) || 
                         message.match(/job\s+(?:number|id|#)?\s*([A-Z0-9-]+)/i);
      
      if (jobIdMatch && jobIdMatch[1]) {
        jobId = jobIdMatch[1];
      }
    }
    
    if (jobId) {
      // If a specific job ticket ID is mentioned, look it up
      console.log('Looking up job ticket with ID:', jobId);
      
      const query = supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients(id, first_name, last_name, email, phone),
          vehicle:vehicles(id, make, model, year, license_plate),
          technician:profiles(id, first_name, last_name)
        `)
        .eq('id', jobId);
        
      if (garageId) {
        query.eq('garage_id', garageId);
      }
      
      const { data: jobTicket, error } = await query.single();
      
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

// Helper function to determine if a message is a job listing request
function isJobListingRequest(message: string): boolean {
  const listingPatterns = [
    /(?:list|show|display|give me|get)\s+(?:all\s+)?(jobs|tickets|job tickets)/i,
    /(?:jobs|tickets|work)\s+(?:in\s+progress|ongoing|active|current)/i,
    /(?:table|list|report)\s+(?:of|with|for)\s+(?:jobs|tickets|work)/i,
    /(?:give|show)\s+me\s+a\s+table/i
  ];
  
  return listingPatterns.some(pattern => pattern.test(message));
}

// New handler for job listing requests
async function handleJobListingRequest(message: string, supabase: any, garageId?: string): Promise<string> {
  console.log('Handling job listing request:', message);
  
  try {
    // Determine if we need to filter by status
    let statusFilter = null;
    if (/\b(?:in progress|ongoing|active)\b/i.test(message)) {
      statusFilter = 'in_progress';
    } else if (/\b(?:completed|finished|done)\b/i.test(message)) {
      statusFilter = 'completed';
    } else if (/\b(?:received|new|unassigned)\b/i.test(message)) {
      statusFilter = 'received';
    }
    
    // Determine if we need to filter by technician
    let technicianFilter = null;
    const technicianMatch = message.match(/\b(?:by|for|assigned to)\s+(?:technician|tech)?\s+([A-Za-z\s]+?)(?:\b|$)/i);
    if (technicianMatch && technicianMatch[1]) {
      technicianFilter = technicianMatch[1].trim();
    }
    
    // Build the query
    let query = supabase
      .from('job_tickets')
      .select(`
        *,
        client:clients(id, first_name, last_name),
        vehicle:vehicles(id, make, model, license_plate),
        technician:profiles(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });
    
    // Apply the garage filter if available
    if (garageId) {
      query = query.eq('garage_id', garageId);
    }
    
    // Apply status filter if present
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    // Execute the query
    const { data: jobTickets, error } = await query;
    
    if (error) {
      console.error('Error fetching job tickets:', error);
      return "I'm sorry, there was an error retrieving the job tickets. Please try again later.";
    }
    
    if (!jobTickets || jobTickets.length === 0) {
      if (statusFilter) {
        return `I couldn't find any ${statusFilter.replace('_', ' ')} job tickets.`;
      } else {
        return "I couldn't find any job tickets.";
      }
    }
    
    // If we have a technician filter, apply it after fetching the results
    let filteredTickets = jobTickets;
    if (technicianFilter) {
      filteredTickets = jobTickets.filter(ticket => {
        if (!ticket.technician) return false;
        
        const techName = `${ticket.technician.first_name} ${ticket.technician.last_name}`.toLowerCase();
        return techName.includes(technicianFilter.toLowerCase());
      });
      
      if (filteredTickets.length === 0) {
        return `I couldn't find any job tickets assigned to ${technicianFilter}.`;
      }
    }
    
    // Create the response
    let statusText = statusFilter ? statusFilter.replace('_', ' ') : 'all';
    let response = `Here are the ${statusText} jobs`;
    
    if (technicianFilter) {
      response += ` assigned to ${technicianFilter}`;
    }
    
    response += `:\n\n`;
    
    // Format each job ticket
    filteredTickets.forEach((ticket, index) => {
      const ticketId = ticket.ticket_number || ticket.id;
      const clientName = ticket.client ? `${ticket.client.first_name} ${ticket.client.last_name}` : 'Unknown Client';
      const vehicleInfo = ticket.vehicle ? `${ticket.vehicle.make} ${ticket.vehicle.model}` : 'Unknown Vehicle';
      const licensePlate = ticket.vehicle && ticket.vehicle.license_plate ? ` (${ticket.vehicle.license_plate})` : '';
      const technicianName = ticket.technician ? `${ticket.technician.first_name} ${ticket.technician.last_name}` : 'Unassigned';
      const status = ticket.status ? ticket.status.replace('_', ' ') : 'Unknown';
      
      response += `${ticketId} - ${status}\n`;
      response += `Vehicle: ${vehicleInfo}${licensePlate}\n`;
      response += `Client: ${clientName}\n`;
      response += `Technician: ${technicianName}\n`;
      response += `Issue: ${ticket.description ? (ticket.description.length > 50 ? ticket.description.substring(0, 47) + '...' : ticket.description) : 'No description'}\n`;
      
      // Add separator between tickets unless it's the last one
      if (index < filteredTickets.length - 1) {
        response += `\n${'-'.repeat(40)}\n\n`;
      }
    });
    
    return response;
  } catch (error) {
    console.error('Error in handleJobListingRequest:', error);
    return "I'm sorry, I encountered an error while retrieving the job listing.";
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
