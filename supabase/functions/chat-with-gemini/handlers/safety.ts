
import { safetyProtocols } from "../data/safetyProtocols.ts";
import { createDataService } from "../data-service.ts";

export async function handleSafetyProtocol(
  message: string,
  supabase: any, 
  entities?: Record<string, string>
): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  try {
    // Get user's garage ID from the request context if available
    const garageId = supabase?.auth?.garageId;
    let dataService;
    
    if (garageId) {
      dataService = createDataService(garageId);
    }
    
    // If we have extracted entities from our classifier, use them
    if (entities) {
      console.log('Using extracted safety entities:', entities);
      
      // Look for specific safety protocols or topics in the entities
      for (const [key, value] of Object.entries(entities)) {
        if (key === "protocol" || key === "procedure") {
          for (const [protocolKey, protocol] of Object.entries(safetyProtocols.specific)) {
            if (value.toLowerCase().includes(protocolKey)) {
              return protocol;
            }
          }
        }
      }
    }
    
    // Check for specific safety protocols first
    for (const [key, protocol] of Object.entries(safetyProtocols.specific)) {
      if (lowerMessage.includes(key)) {
        return protocol;
      }
    }
    
    // If no specific protocol matches, return general safety guidelines
    return "Here are our general safety protocols:\n" + 
      safetyProtocols.general.map(protocol => `- ${protocol}`).join('\n');
  } catch (error) {
    console.error("Error in safety protocol handler:", error);
    return "I'm having trouble accessing safety protocol information at the moment. Please try again later.";
  }
}
