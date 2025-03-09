
// Enhanced classification system for the chatbot
import { determineQueryIntent as sharedDetermineQueryIntent, ClassificationResult } from "../shared/classification.ts";

export { ClassificationResult };

export function determineQueryIntent(message: string): ClassificationResult {
  // Use the shared implementation
  return sharedDetermineQueryIntent(message);
}

// Enhanced version of the original function that maintains the same API
export async function determineQueryType(message: string): Promise<string> {
  const result = determineQueryIntent(message);
  console.log('Query classification:', result);
  return result.intent;
}
