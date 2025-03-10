
// Classification utilities for the chat bot
import { determineQueryIntent as sharedDetermineQueryIntent } from "../shared/classification.ts";

// Define the interface locally to eliminate the dependency
export interface ClassificationResult {
  intent: string;
  confidence: number;
  entities?: Record<string, string>;
}

export function determineQueryIntent(message: string): ClassificationResult {
  // Get the enhanced result from shared implementation
  return sharedDetermineQueryIntent(message);
}

// For backwards compatibility
export function determineQueryType(message: string): string {
  const result = determineQueryIntent(message);
  return result.intent;
}
