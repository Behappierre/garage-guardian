
// Enhanced classification system for the chatbot
interface IntentPattern {
  intent: string;
  patterns: string[];
  extractors?: {
    [key: string]: RegExp;
  };
}

const intentPatterns: IntentPattern[] = [
  {
    intent: 'booking',
    patterns: [
      'book', 'schedule', 'appointment', 'book in', 'slot', 'availability',
      'when can i', 'time slot', 'reserve', 'set up', 'arrange'
    ],
    extractors: {
      date: /(?:on|for|at)?\s*(?:the)?\s*(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
      time: /(?:at)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
      service: /(?:for|to)\s*(oil change|tire rotation|brake service|inspection|maintenance|repair|check|service)/i
    }
  },
  {
    intent: 'client',
    patterns: [
      'client', 'customer', 'person', 'contact', 'update customer', 'new client',
      'add client', 'client details', 'customer info', 'client record'
    ],
    extractors: {
      name: /(?:named|called|for)\s*([\w\s]+)(?:\s|$)/i,
      email: /(?:email|e-mail)\s*(?:address|is|at)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      phone: /(?:phone|call|contact)\s*(?:number|at)?\s*((?:\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4})/i
    }
  },
  {
    intent: 'vehicle',
    patterns: [
      'vehicle', 'car', 'automobile', 'truck', 'van', 'suv', 'make', 'model',
      'year', 'vin', 'license', 'plate', 'registration'
    ],
    extractors: {
      make: /(?:make|brand)\s*(?:is|of)?\s*(Toyota|Honda|Ford|Chevrolet|BMW|Mercedes|Audi|Nissan|Hyundai|Kia|Mazda|Subaru|Volkswagen|Volvo|Lexus|Fiat)/i,
      model: /(?:model)\s*(?:is|of)?\s*([\w\s]+?)(?:\s|$)/i,
      year: /(?:year|from)\s*(\d{4})/i,
      vin: /(?:vin|vehicle identification number)\s*(?:is|of)?\s*([A-HJ-NPR-Z0-9]{17})/i
    }
  },
  {
    intent: 'jobSheet',
    patterns: [
      'job', 'ticket', 'repair', 'work', 'fix', 'issue', 'problem',
      'service record', 'maintenance record', 'work order', 'repair order'
    ],
    extractors: {
      jobId: /(?:job|ticket|order)\s*(?:number|id|#)?\s*([A-Z0-9-]+)/i,
      issue: /(?:issue|problem|broken|not working)\s*(?:with|is)?\s*([\w\s]+?)(?:\s|$)/i
    }
  },
  {
    intent: 'safety',
    patterns: [
      'safety', 'protocol', 'procedure', 'guideline', 'precaution',
      'safe', 'hazard', 'risk', 'warning', 'danger', 'emergency'
    ]
  },
  {
    intent: 'billing',
    patterns: [
      'bill', 'invoice', 'payment', 'charge', 'cost', 'price',
      'fee', 'pay', 'receipt', 'transaction', 'credit', 'debit', 'card'
    ],
    extractors: {
      amount: /(?:amount|total|cost|price)\s*(?:of|is)?\s*\$?(\d+(?:\.\d{2})?)/i,
      invoiceId: /(?:invoice|bill|receipt)\s*(?:number|id|#)?\s*([A-Z0-9-]+)/i
    }
  },
  {
    intent: 'analytics',
    patterns: [
      'analytics', 'report', 'statistics', 'data', 'metrics', 'performance',
      'numbers', 'trends', 'analysis', 'insights', 'summary', 'dashboard'
    ],
    extractors: {
      period: /(?:for|over|during|in the|in|last)\s*(week|month|quarter|year|6 months)/i,
      metric: /(?:show|see|view|about)\s*(revenue|appointments|clients|vehicles|jobs|services|sales)/i
    }
  }
];

export interface ClassificationResult {
  intent: string;
  confidence: number;
  entities?: Record<string, string>;
}

export function determineQueryIntent(message: string): ClassificationResult {
  const lowerMessage = message.toLowerCase();
  const results: {intent: string, score: number, entities?: Record<string, string>}[] = [];
  
  // Score each intent based on pattern matches
  for (const intentPattern of intentPatterns) {
    let score = 0;
    
    // Count matching patterns
    const matchedPatterns = intentPattern.patterns.filter(pattern => 
      lowerMessage.includes(pattern.toLowerCase())
    );
    
    if (matchedPatterns.length === 0) continue;
    
    // Calculate score based on pattern matches
    score = matchedPatterns.length / intentPattern.patterns.length;
    
    // Extract entities if available
    const entities: Record<string, string> = {};
    if (intentPattern.extractors) {
      for (const [entityName, regex] of Object.entries(intentPattern.extractors)) {
        const match = message.match(regex);
        if (match && match[1]) {
          entities[entityName] = match[1].trim();
          score += 0.1; // Boost score for each extracted entity
        }
      }
    }
    
    results.push({
      intent: intentPattern.intent,
      score,
      entities: Object.keys(entities).length > 0 ? entities : undefined
    });
  }
  
  // If no matches found, default to automotive
  if (results.length === 0) {
    return {
      intent: 'automotive',
      confidence: 0.5
    };
  }
  
  // Sort by score and return the best match
  results.sort((a, b) => b.score - a.score);
  
  return {
    intent: results[0].intent,
    confidence: results[0].score,
    entities: results[0].entities
  };
}

// Maintain compatibility with older code
export function determineQueryType(message: string): string {
  const result = determineQueryIntent(message);
  console.log('Query classification:', result);
  return result.intent;
}
