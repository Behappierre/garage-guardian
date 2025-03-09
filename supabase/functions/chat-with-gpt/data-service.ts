
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { DatabaseCache } from './cache.ts';

export class GarageDataService {
  private supabase: SupabaseClient;
  private cache: DatabaseCache;
  private garageId?: string;
  
  constructor(supabaseUrl: string, supabaseKey: string, garageId?: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.cache = new DatabaseCache();
    this.garageId = garageId;
  }
  
  setGarageContext(garageId: string): void {
    this.garageId = garageId;
    // Clear cache when changing garage context
    this.cache.clear();
  }
  
  private applyGarageFilter(query: any): any {
    if (this.garageId) {
      return query.eq('garage_id', this.garageId);
    }
    return query;
  }
  
  // CLIENT OPERATIONS
  async getClients(options: { search?: string, limit?: number } = {}): Promise<any[]> {
    const cacheKey = `clients:${this.garageId || 'all'}:${options.search || ''}:${options.limit || 20}`;
    
    return this.cache.getOrFetch(cacheKey, async () => {
      let query = this.supabase.from('clients').select('*');
      
      // Apply garage filter if applicable
      query = this.applyGarageFilter(query);
      
      // Apply search if provided
      if (options.search) {
        query = query.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
      
      return data || [];
    });
  }
  
  async getClientById(clientId: string): Promise<any> {
    const cacheKey = `client:${clientId}`;
    
    return this.cache.getOrFetch(cacheKey, async () => {
      const { data, error } = await this.supabase
        .from('clients')
        .select(`
          *,
          vehicles(*)
        `)
        .eq('id', clientId)
        .single();
        
      if (error) {
        console.error(`Error fetching client ${clientId}:`, error);
        return null;
      }
      
      return data;
    });
  }
  
  // APPOINTMENT OPERATIONS
  async getAppointments(options: { 
    clientId?: string, 
    vehicleId?: string,
    startDate?: Date, 
    endDate?: Date,
    limit?: number
  } = {}): Promise<any[]> {
    let query = this.supabase.from('appointments').select(`
      *,
      client:clients(*),
      vehicle:vehicles(*)
    `);
    
    // Apply garage filter if applicable
    query = this.applyGarageFilter(query);
    
    // Filter by client if provided
    if (options.clientId) {
      query = query.eq('client_id', options.clientId);
    }
    
    // Filter by vehicle if provided
    if (options.vehicleId) {
      query = query.eq('vehicle_id', options.vehicleId);
    }
    
    // Apply date range if provided
    if (options.startDate) {
      query = query.gte('start_time', options.startDate.toISOString());
    }
    
    if (options.endDate) {
      query = query.lte('start_time', options.endDate.toISOString());
    }
    
    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(50);
    }
    
    // Order by start time
    query = query.order('start_time', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
    
    return data || [];
  }
  
  // JOB TICKET OPERATIONS
  async getJobTickets(options: { 
    clientId?: string,
    vehicleId?: string, 
    status?: string,
    limit?: number 
  } = {}): Promise<any[]> {
    let query = this.supabase.from('job_tickets').select(`
      *,
      client:clients(*),
      vehicle:vehicles(*),
      technician:profiles(id, first_name, last_name)
    `);
    
    // Apply garage filter if applicable
    query = this.applyGarageFilter(query);
    
    // Apply additional filters
    if (options.clientId) {
      query = query.eq('client_id', options.clientId);
    }
    
    if (options.vehicleId) {
      query = query.eq('vehicle_id', options.vehicleId);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(20);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching job tickets:', error);
      return [];
    }
    
    return data || [];
  }
  
  // Get the raw Supabase client for custom queries
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }
}

// Export function to create a data service instance
export function createDataService(garageId?: string) {
  return new GarageDataService(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_ANON_KEY') || '',
    garageId
  );
}
