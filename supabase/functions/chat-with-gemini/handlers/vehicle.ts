
import { createDataService } from "../data-service.ts";

export async function handleVehicleLookup(
  message: string, 
  supabase: any, 
  entities?: Record<string, string>
): Promise<string> {
  try {
    // Get user's garage ID from the request context if available
    const garageId = supabase.auth.garageId;
    const dataService = createDataService(garageId);
    
    // Default response
    let response = "I can help you with vehicle lookups. What specifically would you like to know?";
    
    // If we have extracted entities from our classifier, use them
    if (entities) {
      console.log('Using extracted vehicle entities:', entities);
      
      // Use the make and model entities if available
      if (entities.make && entities.model) {
        const searchTerm = `${entities.make} ${entities.model}`;
        const vehicles = await dataService.getVehicles({ search: searchTerm, limit: 5 });
        
        if (vehicles.length > 0) {
          // Found matching vehicles
          response = `I found ${vehicles.length} ${entities.make} ${entities.model} vehicles in our system:\n\n`;
          
          vehicles.forEach((vehicle, index) => {
            response += `${index + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            if (vehicle.license_plate) {
              response += ` (Registration: ${vehicle.license_plate})`;
            }
            response += "\n";
          });
          
          response += "\nWould you like more details about any of these vehicles?";
        } else {
          // No matching vehicles found
          response = `I couldn't find any ${entities.make} ${entities.model} vehicles in our system. Would you like to add a new vehicle?`;
        }
      }
      // Handle VIN lookup if available
      else if (entities.vin) {
        const searchTerm = entities.vin;
        const vehicles = await dataService.getVehicles({ search: searchTerm, limit: 1 });
        
        if (vehicles.length > 0) {
          const vehicle = vehicles[0];
          response = `I found a vehicle with VIN ${entities.vin}:\n\n`;
          response += `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          if (vehicle.license_plate) {
            response += ` (Registration: ${vehicle.license_plate})`;
          }
          response += "\n\nWould you like to see service history for this vehicle?";
        } else {
          response = `I couldn't find any vehicle with VIN ${entities.vin} in our system.`;
        }
      }
      // Handle license plate lookup if available
      else if (entities.license_plate || entities.registration) {
        const searchTerm = entities.license_plate || entities.registration;
        const vehicles = await dataService.getVehicles({ search: searchTerm, limit: 1 });
        
        if (vehicles.length > 0) {
          const vehicle = vehicles[0];
          response = `I found a vehicle with registration ${searchTerm}:\n\n`;
          response += `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          response += "\n\nWould you like to see service history or create a job ticket for this vehicle?";
        } else {
          response = `I couldn't find any vehicle with registration ${searchTerm} in our system.`;
        }
      }
      // Handle other queries about vehicles
      else if (entities.year) {
        const searchTerm = entities.year;
        const vehicles = await dataService.getVehicles({ search: searchTerm, limit: 10 });
        
        if (vehicles.length > 0) {
          response = `I found ${vehicles.length} vehicles from ${entities.year}:\n\n`;
          
          const vehiclesByMake: Record<string, number> = {};
          vehicles.forEach(vehicle => {
            vehiclesByMake[vehicle.make] = (vehiclesByMake[vehicle.make] || 0) + 1;
          });
          
          for (const [make, count] of Object.entries(vehiclesByMake)) {
            response += `- ${count} ${make}${count > 1 ? 's' : ''}\n`;
          }
        } else {
          response = `I couldn't find any vehicles from ${entities.year} in our system.`;
        }
      }
      // Generic search if any vehicle entity is present
      else if (Object.keys(entities).length > 0) {
        // Use the first entity as a search term
        const searchTerm = Object.values(entities)[0];
        const vehicles = await dataService.getVehicles({ search: searchTerm, limit: 5 });
        
        if (vehicles.length > 0) {
          response = `I found ${vehicles.length} vehicles matching '${searchTerm}':\n\n`;
          
          vehicles.forEach((vehicle, index) => {
            response += `${index + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            if (vehicle.license_plate) {
              response += ` (Registration: ${vehicle.license_plate})`;
            }
            response += "\n";
          });
        } else {
          response = `I couldn't find any vehicles matching '${searchTerm}' in our system.`;
        }
      }
    } 
    // Handle generic vehicle inquiries
    else if (message.toLowerCase().includes("how many vehicles")) {
      const vehicles = await dataService.getVehicles({ limit: 1000 });
      
      if (vehicles.length > 0) {
        // Count by make for a more interesting response
        const makeCount: Record<string, number> = {};
        vehicles.forEach(vehicle => {
          makeCount[vehicle.make] = (makeCount[vehicle.make] || 0) + 1;
        });
        
        response = `We have ${vehicles.length} vehicles in our system. Here's a breakdown by make:\n\n`;
        
        for (const [make, count] of Object.entries(makeCount)) {
          response += `- ${make}: ${count} vehicle${count > 1 ? 's' : ''}\n`;
        }
      } else {
        response = "We don't have any vehicles registered in our system yet.";
      }
    } else if (message.toLowerCase().includes("latest vehicles") || message.toLowerCase().includes("recent vehicles")) {
      const vehicles = await dataService.getVehicles({ limit: 5 });
      
      if (vehicles.length > 0) {
        response = "Here are the most recently added vehicles:\n\n";
        
        vehicles.forEach((vehicle, index) => {
          response += `${index + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          if (vehicle.license_plate) {
            response += ` (Registration: ${vehicle.license_plate})`;
          }
          response += "\n";
        });
      } else {
        response = "We don't have any vehicles registered in our system yet.";
      }
    }
    
    return response;
  } catch (error) {
    console.error("Error in vehicle lookup handler:", error);
    return "I'm having trouble accessing vehicle information right now. Please try again later.";
  }
}
