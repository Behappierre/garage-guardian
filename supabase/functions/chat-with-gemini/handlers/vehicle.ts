
import { createDataService } from "../data-service.ts";
import { getVehicleServiceHistory, findSimilarVehicles, getCommonIssuesForModel } from "./relationship-mining.ts";

export async function handleVehicleInformation(
  message: string, 
  supabase: any,
  entities?: Record<string, string>
): Promise<string> {
  console.log('Processing vehicle info request:', message);
  
  try {
    // Get user's garage ID from context
    const garageId = supabase.auth.garageId;
    const dataService = createDataService(garageId);
    
    // Extract entities if available
    if (entities) {
      console.log('Using extracted vehicle entities:', entities);
      
      // Handle vehicle make/model query
      if (entities.make && entities.model) {
        // Find vehicles of the specified make/model
        let query = supabase.from('vehicles')
          .select('*')
          .eq('make', entities.make)
          .eq('model', entities.model);
          
        if (garageId) {
          query = query.eq('garage_id', garageId);
        }
        
        const { data: vehicles, error } = await query;
        
        if (error) {
          console.error('Error querying vehicles:', error);
          return `I had trouble finding information about ${entities.make} ${entities.model} vehicles.`;
        }
        
        if (vehicles && vehicles.length > 0) {
          // Get common issues for this make/model
          const commonIssuesData = await getCommonIssuesForModel(entities.make, entities.model, supabase);
          
          let response = `I found ${vehicles.length} ${entities.make} ${entities.model} vehicles in your system.\n\n`;
          
          // Add common issues if available
          if (commonIssuesData && commonIssuesData.commonIssues.length > 0) {
            response += `Common issues with ${entities.make} ${entities.model} vehicles:\n`;
            commonIssuesData.commonIssues.forEach((issue, idx) => {
              response += `${idx + 1}. ${issue.issue.charAt(0).toUpperCase() + issue.issue.slice(1)} issues (${issue.count} occurrences)\n`;
            });
            response += `\n`;
          }
          
          // List the vehicles
          response += `Here are the ${entities.make} ${entities.model} vehicles:\n`;
          vehicles.forEach((vehicle, idx) => {
            response += `${idx + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            if (vehicle.license_plate) {
              response += ` (Registration: ${vehicle.license_plate})`;
            }
            response += `\n`;
          });
          
          return response;
        } else {
          return `I couldn't find any ${entities.make} ${entities.model} vehicles in your system.`;
        }
      }
      
      // Handle vehicle year query
      if (entities.year) {
        const year = parseInt(entities.year);
        if (!isNaN(year)) {
          let query = supabase.from('vehicles')
            .select('*')
            .eq('year', year);
            
          if (garageId) {
            query = query.eq('garage_id', garageId);
          }
          
          const { data: vehicles, error } = await query;
          
          if (error) {
            console.error('Error querying vehicles by year:', error);
            return `I had trouble finding information about vehicles from ${year}.`;
          }
          
          if (vehicles && vehicles.length > 0) {
            let response = `I found ${vehicles.length} vehicles from ${year}:\n\n`;
            
            vehicles.forEach((vehicle, idx) => {
              response += `${idx + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
              if (vehicle.license_plate) {
                response += ` (Registration: ${vehicle.license_plate})`;
              }
              response += `\n`;
            });
            
            return response;
          } else {
            return `I couldn't find any vehicles from ${year} in your system.`;
          }
        }
      }
    }
    
    // Handle general vehicle queries
    if (message.toLowerCase().includes('history') || message.toLowerCase().includes('service history')) {
      const licenseRegex = /\b([A-Z0-9]{1,7})\b/g;
      const licenseMatches = [...message.matchAll(licenseRegex)];
      
      if (licenseMatches.length > 0) {
        const licensePlate = licenseMatches[0][0];
        
        let query = supabase.from('vehicles')
          .select('*')
          .ilike('license_plate', licensePlate);
          
        if (garageId) {
          query = query.eq('garage_id', garageId);
        }
        
        const { data: vehicles, error } = await query;
        
        if (error || !vehicles || vehicles.length === 0) {
          return `I couldn't find a vehicle with license plate ${licensePlate}.`;
        }
        
        const vehicle = vehicles[0];
        
        // Use relationship mining to get detailed vehicle history
        const serviceHistory = await getVehicleServiceHistory(vehicle.id, supabase);
        
        if (serviceHistory) {
          let response = `Service history for ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.license_plate}):\n\n`;
          
          const jobTickets = serviceHistory.job_tickets || [];
          
          if (jobTickets.length > 0) {
            jobTickets.forEach((ticket, idx) => {
              response += `${idx + 1}. ${new Date(ticket.created_at).toLocaleDateString()}`;
              response += ` - Ticket #${ticket.ticket_number}\n`;
              response += `   Status: ${ticket.status}\n`;
              response += `   ${ticket.description.substring(0, 100)}${ticket.description.length > 100 ? '...' : ''}\n`;
              
              if (ticket.assigned_technician) {
                response += `   Technician: ${ticket.assigned_technician.first_name} ${ticket.assigned_technician.last_name}\n`;
              }
              
              // Add time entries if available
              if (ticket.time_entries && ticket.time_entries.length > 0) {
                const totalMinutes = ticket.time_entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                response += `   Labor time: ${hours}h ${minutes}m\n`;
              }
              
              response += `\n`;
            });
          } else {
            response += `No service records found for this vehicle.`;
          }
          
          return response;
        } else {
          // Fallback to basic job ticket query
          const { data: jobTickets, error: ticketError } = await supabase
            .from('job_tickets')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .order('created_at', { ascending: false });
            
          if (ticketError) {
            return `I found the vehicle ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.license_plate}), but couldn't retrieve its service history.`;
          }
          
          let response = `Service history for ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.license_plate}):\n\n`;
          
          if (jobTickets && jobTickets.length > 0) {
            jobTickets.forEach((ticket, idx) => {
              response += `${idx + 1}. ${new Date(ticket.created_at).toLocaleDateString()}`;
              response += ` - Ticket #${ticket.ticket_number}: ${ticket.status}\n`;
              response += `   ${ticket.description.substring(0, 100)}${ticket.description.length > 100 ? '...' : ''}\n\n`;
            });
          } else {
            response += `No service records found for this vehicle.`;
          }
          
          return response;
        }
      }
    }
    
    // Handle count request
    if (message.toLowerCase().includes('how many') && message.toLowerCase().includes('vehicle')) {
      const { count, error } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error('Error counting vehicles:', error);
        return "I couldn't determine the number of vehicles in your system.";
      }
      
      return `You have ${count} vehicles registered in your system.`;
    }
    
    // Show recent vehicles as default
    const { data: recentVehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error || !recentVehicles) {
      return "I couldn't retrieve vehicle information from your system.";
    }
    
    if (recentVehicles.length === 0) {
      return "There are no vehicles registered in your system yet.";
    }
    
    let response = `Here are the ${recentVehicles.length} most recent vehicles:\n\n`;
    
    recentVehicles.forEach((vehicle, idx) => {
      response += `${idx + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      if (vehicle.license_plate) {
        response += ` (Registration: ${vehicle.license_plate})`;
      }
      response += `\n`;
    });
    
    return response;
  } catch (err) {
    console.error('Error in vehicle handler:', err);
    return "I'm having trouble accessing vehicle information right now. Please try again later.";
  }
}
