
import { safetyProtocols } from "../data/safetyProtocols.ts";

export async function handleSafetyProtocol(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // Check for specific safety protocols first
  for (const [key, protocol] of Object.entries(safetyProtocols.specific)) {
    if (lowerMessage.includes(key)) {
      return protocol;
    }
  }
  
  // If no specific protocol matches, return general safety guidelines
  return "Here are our general safety protocols:\n" + 
    safetyProtocols.general.map(protocol => `- ${protocol}`).join('\n');
}
