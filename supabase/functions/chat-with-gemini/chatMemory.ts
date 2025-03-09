import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

interface ConversationContext {
  recentTopics: string[];
  entities: {
    clients?: { id: string; name: string }[];
    vehicles?: { id: string; description: string }[];
    appointments?: { id: string; datetime: string }[];
    jobSheets?: { id: string; description: string }[];
  };
  lastQueryType: string;
  currentFlow?: {
    type: string;
    step: string;
    data: Record<string, any>;
  };
}

export class ConversationMemory {
  private supabase: any;
  private userId: string;
  private context: ConversationContext;
  private maxHistoryLength: number = 10;
  
  constructor(supabase: any, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.context = {
      recentTopics: [],
      entities: {},
      lastQueryType: ''
    };
  }
  
  async initialize(): Promise<void> {
    const { data: recentMessages, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(this.maxHistoryLength);
      
    if (error) {
      console.error('Error loading conversation history:', error);
      return;
    }
    
    if (recentMessages?.length > 0) {
      recentMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      recentMessages.forEach(msg => {
        this.processMessage(msg.message, msg.response, msg.metadata?.query_type);
      });
    }
  }
  
  private processMessage(message: string, response: string, queryType?: string): void {
    if (queryType) {
      this.context.lastQueryType = queryType;
      
      if (!this.context.recentTopics.includes(queryType)) {
        this.context.recentTopics.unshift(queryType);
        
        if (this.context.recentTopics.length > 5) {
          this.context.recentTopics.pop();
        }
      }
    }
    
    this.extractEntities(message, queryType || '');
  }
  
  private extractEntities(message: string, queryType: string): void {
    const lowerMessage = message.toLowerCase();
    
    if (queryType === 'client' && lowerMessage.includes('client')) {
      const nameMatch = lowerMessage.match(/(?:client|customer)\s+(?:named|called)?\s*(\w+\s+\w+)/i);
      if (nameMatch && nameMatch[1]) {
        this.context.entities.clients = this.context.entities.clients || [];
        this.context.entities.clients.unshift({ 
          id: `temp_${Date.now()}`, 
          name: nameMatch[1] 
        });
      }
    }
    
    if (queryType === 'vehicle' && (lowerMessage.includes('car') || lowerMessage.includes('vehicle'))) {
      const vehicleMatch = lowerMessage.match(/(?:car|vehicle)\s+(?:is|a)?\s*(?:the)?\s*(\w+\s+\w+)/i);
      if (vehicleMatch && vehicleMatch[1]) {
        this.context.entities.vehicles = this.context.entities.vehicles || [];
        this.context.entities.vehicles.unshift({ 
          id: `temp_${Date.now()}`, 
          description: vehicleMatch[1] 
        });
      }
    }
  }
  
  updateContext(queryType: string, entities?: Record<string, any>): void {
    this.context.lastQueryType = queryType;
    
    if (!this.context.recentTopics.includes(queryType)) {
      this.context.recentTopics.unshift(queryType);
      
      if (this.context.recentTopics.length > 5) {
        this.context.recentTopics.pop();
      }
    }
    
    if (entities) {
      for (const [key, value] of Object.entries(entities)) {
        if (key === 'client') {
          this.context.entities.clients = this.context.entities.clients || [];
          this.context.entities.clients.unshift(value as any);
        } else if (key === 'vehicle') {
          this.context.entities.vehicles = this.context.entities.vehicles || [];
          this.context.entities.vehicles.unshift(value as any);
        } else if (key === 'appointment') {
          this.context.entities.appointments = this.context.entities.appointments || [];
          this.context.entities.appointments.unshift(value as any);
        } else if (key === 'jobSheet') {
          this.context.entities.jobSheets = this.context.entities.jobSheets || [];
          this.context.entities.jobSheets.unshift(value as any);
        }
      }
    }
  }
  
  startFlow(flowType: string, initialData: Record<string, any> = {}): void {
    this.context.currentFlow = {
      type: flowType,
      step: 'initial',
      data: initialData
    };
  }
  
  updateFlow(step: string, data: Record<string, any>): void {
    if (this.context.currentFlow) {
      this.context.currentFlow.step = step;
      this.context.currentFlow.data = {
        ...this.context.currentFlow.data,
        ...data
      };
    }
  }
  
  endFlow(): void {
    this.context.currentFlow = undefined;
  }
  
  getContext(): ConversationContext {
    return this.context;
  }
  
  getPreviousContext(): string {
    const context = this.context;
    
    let contextSummary = '';
    
    if (context.recentTopics.length > 0) {
      contextSummary += `Recent topics: ${context.recentTopics.join(', ')}.\n`;
    }
    
    if (context.lastQueryType) {
      contextSummary += `Last discussed: ${context.lastQueryType}.\n`;
    }
    
    if (context.entities.clients?.length) {
      contextSummary += `Mentioned clients: ${context.entities.clients.map(c => c.name).join(', ')}.\n`;
    }
    
    if (context.entities.vehicles?.length) {
      contextSummary += `Mentioned vehicles: ${context.entities.vehicles.map(v => v.description).join(', ')}.\n`;
    }
    
    if (context.currentFlow) {
      contextSummary += `Current flow: ${context.currentFlow.type} (step: ${context.currentFlow.step}).\n`;
    }
    
    return contextSummary;
  }
  
  async save(message: string, response: string, metadata: Record<string, any> = {}): Promise<void> {
    try {
      const enhancedMetadata = {
        ...metadata,
        context: this.context
      };
      
      const { error } = await this.supabase
        .from('chat_messages')
        .insert({
          user_id: this.userId,
          message,
          response,
          metadata: enhancedMetadata
        });
        
      if (error) {
        console.error('Error saving conversation memory:', error);
      }
    } catch (err) {
      console.error('Exception saving conversation memory:', err);
    }
  }
}

export async function updateChatMemory(
  userId: string, 
  message: string, 
  response: string, 
  queryType?: string,
  entities?: Record<string, any>,
  supabase?: any
): Promise<void> {
  if (!userId || !supabase) {
    console.log('Missing required parameters for chat memory update');
    return;
  }
  
  try {
    const memory = new ConversationMemory(supabase, userId);
    
    await memory.initialize();
    
    if (queryType) {
      memory.updateContext(queryType, entities);
    }
    
    await memory.save(message, response, { query_type: queryType });
    
    console.log('Chat memory updated successfully for user:', userId);
  } catch (error) {
    console.error('Error in updateChatMemory:', error);
  }
}

export async function getConversationContext(userId: string, supabase: any): Promise<string> {
  try {
    if (!userId || !supabase) return '';
    
    const memory = new ConversationMemory(supabase, userId);
    await memory.initialize();
    
    return memory.getPreviousContext();
  } catch (error) {
    console.error('Error getting conversation context:', error);
    return '';
  }
}
