
// Optimized classification system for the chatbot
export interface IntentPattern {
  intent: string;
  patterns: string[];
  extractors?: {
    [key: string]: RegExp;
  };
}

export interface ClassificationResult {
  intent: string;
  confidence: number;
  entities?: Record<string, string>;
}

// Using a Map for more efficient lookups
const intentPatternsMap = new Map<string, string[]>();

// Initialize the map with patterns (call this once at startup)
export function initializePatterns(extraBookingPatterns?: string[]) {
  const baseBookingPatterns = [
    'book', 'schedule', 'appointment', 'book in', 'slot', 'availability',
    'when can i', 'time slot', 'reserve', 'set up', 'arrange'
  ];
  
  // New patterns for appointment modifications
  const appointmentModificationPatterns = [
    'move', 'reschedule', 'change', 'update', 'switch', 
    'postpone', 'adjust', 'shift', 'modify'
  ];
  
  // Merge extra booking patterns if provided
  const bookingPatterns = extraBookingPatterns 
    ? [...baseBookingPatterns, ...extraBookingPatterns]
    : baseBookingPatterns;
  
  intentPatternsMap.set('booking', bookingPatterns);
  intentPatternsMap.set('appointment_modification', appointmentModificationPatterns);
  
  intentPatternsMap.set('client', [
    'client', 'customer', 'person', 'contact', 'update customer', 'new client',
    'add client', 'client details', 'customer info', 'client record'
  ]);
  
  intentPatternsMap.set('vehicle', [
    'vehicle', 'car', 'automobile', 'truck', 'van', 'suv', 'make', 'model',
    'year', 'vin', 'license', 'plate', 'registration'
  ]);
  
  intentPatternsMap.set('jobSheet', [
    'job', 'ticket', 'repair', 'work', 'fix', 'issue', 'problem',
    'service record', 'maintenance record', 'work order', 'repair order'
  ]);
  
  intentPatternsMap.set('jobListing', [
    'list jobs', 'show jobs', 'all jobs', 'jobs in progress', 'current jobs',
    'active jobs', 'job list', 'job table', 'job report', 'job summary',
    'work in progress', 'ongoing work', 'technician workload',
    'give me a table', 'list all', 'show all', 'show me', 'display'
  ]);
  
  intentPatternsMap.set('safety', [
    'safety', 'protocol', 'procedure', 'guideline', 'precaution',
    'safe', 'hazard', 'risk', 'warning', 'danger', 'emergency'
  ]);
  
  intentPatternsMap.set('billing', [
    'bill', 'invoice', 'payment', 'charge', 'cost', 'price',
    'fee', 'pay', 'receipt', 'transaction', 'credit', 'debit', 'card'
  ]);
  
  intentPatternsMap.set('analytics', [
    'analytics', 'report', 'statistics', 'data', 'metrics', 'performance',
    'numbers', 'trends', 'analysis', 'insights', 'summary', 'dashboard'
  ]);
}

// Entity extractors for various intents
const entityExtractors = {
  'booking': {
    date: /(?:on|for|at)?\s*(?:the)?\s*(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
    time: /(?:at)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    service: /(?:for|to)\s*(oil change|tire rotation|brake service|inspection|maintenance|repair|check|service)/i,
    name: /appointment for\s+([A-Za-z\s]+)(?:\?|$|\s|\.)/i
  },
  'appointment_modification': {
    name: /(?:move|reschedule|change|update)\s+(?:the\s+)?(?:appointment\s+for\s+)?([A-Za-z\s]+?)(?:\s+booking|\s+appointment|\s+to|\s+from|\s+on|\s+at|$)/i,
    date: /(?:to|on|for)\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)|tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
    time: /(?:at)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  },
  'client': {
    name: /(?:named|called|for)\s*([\w\s]+)(?:\s|$)/i,
    email: /(?:email|e-mail)\s*(?:address|is|at)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    phone: /(?:phone|call|contact)\s*(?:number|at)?\s*((?:\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4})/i
  },
  'vehicle': {
    make: /(?:make|brand)\s*(?:is|of)?\s*(Toyota|Honda|Ford|Chevrolet|BMW|Mercedes|Audi|Nissan|Hyundai|Kia|Mazda|Subaru|Volkswagen|Volvo|Lexus|Fiat)/i,
    model: /(?:model)\s*(?:is|of)?\s*([\w\s]+?)(?:\s|$)/i,
    year: /(?:year|from)\s*(\d{4})/i,
    vin: /(?:vin|vehicle identification number)\s*(?:is|of)?\s*([A-HJ-NPR-Z0-9]{17})/i
  },
  'jobListing': {
    status: /\b(in progress|active|pending|completed|finished|all)\s+(?:jobs|tickets|work|tasks)/i,
    technicianName: /(?:by|for|assigned to)\s+(?:technician|tech)?\s+([A-Za-z\s]+)/i
  }
};

// Initialize patterns when module is loaded
initializePatterns();

// Optimized classification function
export function determineQueryIntent(message: string): ClassificationResult {
  const lowerMessage = message.toLowerCase();
  const results: {intent: string, score: number, entities?: Record<string, string>}[] = [];
  
  // Score each intent based on pattern matches
  for (const [intent, patterns] of intentPatternsMap.entries()) {
    // Count matching patterns
    const matchedPatterns = patterns.filter(pattern => {
      // For single word patterns, match whole words
      if (!pattern.includes(' ')) {
        const regex = new RegExp(`\\b${pattern}\\b`, 'i');
        return regex.test(lowerMessage);
      }
      // For phrase patterns
      return lowerMessage.includes(pattern.toLowerCase());
    });
    
    if (matchedPatterns.length === 0) continue;
    
    // Calculate score based on pattern matches
    let score = matchedPatterns.length / patterns.length;
    
    // Apply special boost for job listing
    if (intent === 'jobListing') {
      if (/(?:give|show)\s+me\s+a\s+table/i.test(message)) {
        score += 0.3;
      }
      if (/(?:jobs|tickets|work)\s+(?:in\s+progress|ongoing)/i.test(message)) {
        score += 0.2;
      }
    }
    
    // Extract entities if available
    const entities: Record<string, string> = {};
    const extractorsForIntent = entityExtractors[intent as keyof typeof entityExtractors];
    
    if (extractorsForIntent) {
      for (const [entityName, regex] of Object.entries(extractorsForIntent)) {
        const match = message.match(regex);
        if (match && match[1]) {
          entities[entityName] = match[1].trim();
          score += 0.1; // Boost score for each extracted entity
        }
      }
    }
    
    results.push({
      intent,
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
