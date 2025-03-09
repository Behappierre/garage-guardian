
import { createDataService } from "../data-service.ts";

export async function handleClientManagement(
  message: string, 
  supabase: any, 
  entities?: Record<string, string>
): Promise<string> {
  console.log('Processing client request:', message);
  
  try {
    // Get user's garage ID from the request context if available
    const garageId = supabase.auth.garageId;
    const dataService = createDataService(garageId);
    
    // If we have extracted entities from our classifier, use them
    if (entities) {
      console.log('Using extracted client entities:', entities);
      
      // Look for client by name
      if (entities.name) {
        const searchTerm = entities.name;
        const clients = await dataService.getClients({ search: searchTerm, limit: 5 });
        
        if (clients.length > 0) {
          // Found matching clients
          let response = `I found ${clients.length} client${clients.length > 1 ? 's' : ''} matching "${searchTerm}":\n\n`;
          
          for (const client of clients) {
            response += `- ${client.first_name} ${client.last_name}`;
            if (client.email) {
              response += ` (${client.email})`;
            }
            if (client.phone) {
              response += ` | Phone: ${client.phone}`;
            }
            response += '\n';
          }
          
          if (clients.length === 1) {
            const client = clients[0];
            
            // Get client's vehicles
            const vehicles = await dataService.getVehicles({ clientId: client.id });
            if (vehicles.length > 0) {
              response += `\nVehicles owned by ${client.first_name}:\n`;
              vehicles.forEach((vehicle, idx) => {
                response += `${idx + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
                if (vehicle.license_plate) {
                  response += ` (Registration: ${vehicle.license_plate})`;
                }
                response += '\n';
              });
            }
            
            // Get client's appointments
            const appointments = await dataService.getAppointments({ 
              clientId: client.id,
              startDate: new Date() // Only future appointments
            });
            
            if (appointments.length > 0) {
              response += `\nUpcoming appointments for ${client.first_name}:\n`;
              appointments.forEach((appointment, idx) => {
                const date = new Date(appointment.start_time);
                response += `${idx + 1}. ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                response += ` - ${appointment.service_type}\n`;
              });
            }
          }
          
          return response;
        } else {
          return `I couldn't find any clients matching "${searchTerm}" in our system.`;
        }
      }
      
      // Look for client by email
      if (entities.email) {
        const searchTerm = entities.email;
        const clients = await dataService.getClients({ search: searchTerm, limit: 1 });
        
        if (clients.length > 0) {
          const client = clients[0];
          return `I found a client with email ${searchTerm}: ${client.first_name} ${client.last_name}. What would you like to know about this client?`;
        } else {
          return `I couldn't find any clients with email ${searchTerm} in our system.`;
        }
      }
      
      // Look for client by phone
      if (entities.phone) {
        const searchTerm = entities.phone;
        const clients = await dataService.getClients({ search: searchTerm, limit: 1 });
        
        if (clients.length > 0) {
          const client = clients[0];
          return `I found a client with phone ${searchTerm}: ${client.first_name} ${client.last_name}. What would you like to know about this client?`;
        } else {
          return `I couldn't find any clients with phone ${searchTerm} in our system.`;
        }
      }
    }
    
    // Generic client queries
    if (message.toLowerCase().includes("how many clients")) {
      const clients = await dataService.getClients({ limit: 1000 });
      return `You have ${clients.length} clients in your garage.`;
    }
    
    if (message.toLowerCase().includes("recent client") || message.toLowerCase().includes("newest client")) {
      const clients = await dataService.getClients({ limit: 5 });
      
      if (clients.length === 0) {
        return "I don't see any clients in your garage yet. Would you like information on how to add clients?";
      }
      
      const recentClients = clients.slice(0, 3);
      const clientSummary = recentClients.map(client => 
        `${client.first_name} ${client.last_name} (${client.email || 'No email'})`
      ).join(', ');
      
      return `Your most recent clients are ${clientSummary}. How can I help you with client information?`;
    }
    
    // Default response
    const clientCount = (await dataService.getClients({ limit: 1 })).length;
    if (clientCount === 0) {
      return "I don't see any clients in your garage yet. Would you like information on how to add clients?";
    } else {
      const recentClients = await dataService.getClients({ limit: 3 });
      const clientSummary = recentClients.map(client => 
        `${client.first_name} ${client.last_name} (${client.email || 'No email'})`
      ).join(', ');
      
      return `You have ${clientCount} clients in your garage. Your most recent clients are ${clientSummary}. How can I help you with client information?`;
    }
  } catch (err) {
    console.error('Error in client handler:', err);
    return "I'm having trouble accessing client information right now. Please try again later.";
  }
}
