
export async function determineQueryType(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('book') || lowerMessage.includes('appointment')) {
    return 'booking';
  }
  if (lowerMessage.includes('client') || lowerMessage.includes('customer')) {
    return 'client';
  }
  if (lowerMessage.includes('vehicle') || lowerMessage.includes('car')) {
    return 'vehicle';
  }
  if (lowerMessage.includes('safety') || lowerMessage.includes('protocol')) {
    return 'safety';
  }
  if (lowerMessage.includes('job') || lowerMessage.includes('ticket')) {
    return 'jobSheet';
  }
  
  return 'automotive';
}
