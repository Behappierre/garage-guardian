
// Enhanced classification system for the chatbot
import { determineQueryIntent as sharedDetermineQueryIntent } from "../shared/classification.ts";

// Define the interface locally to eliminate the dependency
export interface ClassificationResult {
  intent: string;
  confidence: number;
  entities?: Record<string, string>;
}

// Additional appointment check patterns specific to GPT version
const appointmentCheckPatterns = [
  'have we got an appointment for', 'do we have an appointment for',
  'is there an appointment for', 'when is the appointment for',
  'check appointment', 'lookup appointment', 'find appointment'
];

export function determineQueryIntent(message: string): ClassificationResult {
  // Use the shared implementation with our specific GPT extensions
  return sharedDetermineQueryIntent(message, appointmentCheckPatterns);
}

// Maintain compatibility with older code
export function determineQueryType(message: string): string {
  const result = determineQueryIntent(message);
  console.log('Query classification:', result);
  return result.intent;
}
