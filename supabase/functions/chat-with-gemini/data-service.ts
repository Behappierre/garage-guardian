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
  
  async createClient(clientData: any): Promise<any> {
    // Add garage_id if available
    if (this.garageId) {
      clientData.garage_id = this.garageId;
    }
    
    const { data, error } = await this.supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating client:', error);
      throw error;
    }
    
    // Invalidate cache entries for client lists
    this.cache.invalidateByPrefix(`clients:${this.garageId || 'all'}`);
    
    return data;
  }
  
  // VEHICLE OPERATIONS
  async getVehicles(options: { clientId?: string, search?: string, limit?: number } = {}): Promise<any[]> {
    const cacheKey = `vehicles:${this.garageId || 'all'}:${options.clientId || ''}:${options.search || ''}:${options.limit || 20}`;
    
    return this.cache.getOrFetch(cacheKey, async () => {
      let query = this.supabase.from('vehicles').select('*');
      
      // Apply garage filter if applicable
      query = this.applyGarageFilter(query);
      
      // Filter by client if provided
      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }
      
      // Apply search if provided
      if (options.search) {
        query = query.or(`make.ilike.%${options.search}%,model.ilike.%${options.search}%,license_plate.ilike.%${options.search}%`);
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching vehicles:', error);
        return [];
      }
      
      return data || [];
    });
  }
  
  async getVehicleById(vehicleId: string): Promise<any> {
    const cacheKey = `vehicle:${vehicleId}`;
    
    return this.cache.getOrFetch(cacheKey, async () => {
      const { data, error } = await this.supabase
        .from('vehicles')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('id', vehicleId)
        .single();
        
      if (error) {
        console.error(`Error fetching vehicle ${vehicleId}:`, error);
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
  
  async getAvailableAppointmentSlots(
    startDate: Date, 
    endDate: Date
  ): Promise<{ date: Date, available: boolean }[]> {
    if (!this.garageId) {
      console.error('Cannot check appointment availability without a garage context');
      return [];
    }
    
    // Get existing appointments
    const { data: existingAppointments, error } = await this.supabase
      .from('appointments')
      .select('start_time, end_time, bay')
      .eq('garage_id', this.garageId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());
      
    if (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
    
    // Get garage opening times
    const { data: openingTimes, error: openingTimesError } = await this.supabase
      .from('opening_times')
      .select('*')
      .eq('garage_id', this.garageId);
      
    if (openingTimesError) {
      console.error('Error fetching opening times:', openingTimesError);
      return [];
    }
    
    // Generate all potential slots (based on opening times)
    const slots: { date: Date, available: boolean }[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const dayOpeningTimes = openingTimes?.find(time => time.day_of_week === dayOfWeek);
      
      // Skip if garage is closed this day
      if (!dayOpeningTimes || dayOpeningTimes.is_closed) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      // Parse opening hours
      const startHour = parseInt(dayOpeningTimes.start_time.split(':')[0]);
      const endHour = parseInt(dayOpeningTimes.end_time.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const slotTime = new Date(currentDate);
        slotTime.setHours(hour, 0, 0, 0);
        
        // Check if slot is available (consider all bays)
        const unavailableBays = new Set();
        existingAppointments?.forEach(appointment => {
          const appointmentStart = new Date(appointment.start_time);
          if (appointmentStart.getTime() === slotTime.getTime()) {
            unavailableBays.add(appointment.bay);
          }
        });
        
        // Assume 3 bays: bay1, bay2, and mot
        const availableBays = ['bay1', 'bay2', 'mot'].filter(bay => !unavailableBays.has(bay));
        
        slots.push({
          date: new Date(slotTime),
          available: availableBays.length > 0
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots;
  }
  
  // JOB TICKET OPERATIONS
  async getJobTickets(options: { 
    clientId?: string,
    vehicleId?: string, 
    status?: string,
    technicianId?: string,
    ticketType?: string,
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
    
    if (options.technicianId) {
      query = query.eq('assigned_technician_id', options.technicianId);
    }
    
    if (options.ticketType) {
      query = query.eq('ticket_type', options.ticketType);
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
  
  // SEARCH ACROSS TABLES
  async searchAcrossTables(searchTerm: string): Promise<{
    clients: any[];
    vehicles: any[];
    tickets: any[];
  }> {
    // Parallel queries for better performance
    const [clientsResult, vehiclesResult, ticketsResult] = await Promise.all([
      this.supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(5),
        
      this.supabase
        .from('vehicles')
        .select('id, make, model, year, license_plate, vin')
        .or(`make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%,vin.ilike.%${searchTerm}%`)
        .limit(5),
        
      this.supabase
        .from('job_tickets')
        .select('id, ticket_number, description, status')
        .or(`ticket_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(5)
    ]);
    
    return {
      clients: clientsResult.data || [],
      vehicles: vehiclesResult.data || [],
      tickets: ticketsResult.data || []
    };
  }
  
  // ANALYTICS OPERATIONS
  async getGarageAnalytics(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<any> {
    if (!this.garageId) {
      console.error('Cannot get analytics without a garage context');
      return null;
    }
    
    // Set date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Get appointments in period
    const { data: appointments, error: appointmentsError } = await this.supabase
      .from('appointments')
      .select('id, created_at, start_time')
      .eq('garage_id', this.garageId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
      
    if (appointmentsError) {
      console.error('Error fetching appointments for analytics:', appointmentsError);
      return null;
    }
    
    // Get tickets in period
    const { data: tickets, error: ticketsError } = await this.supabase
      .from('job_tickets')
      .select('id, created_at, status')
      .eq('garage_id', this.garageId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
      
    if (ticketsError) {
      console.error('Error fetching job tickets for analytics:', ticketsError);
      return null;
    }
    
    // Get new clients in period
    const { data: newClients, error: clientsError } = await this.supabase
      .from('clients')
      .select('id, created_at')
      .eq('garage_id', this.garageId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
      
    if (clientsError) {
      console.error('Error fetching new clients for analytics:', clientsError);
      return null;
    }
    
    // Get completed tickets in period
    const { data: completedTickets, error: completedError } = await this.supabase
      .from('job_tickets')
      .select('id, updated_at')
      .eq('garage_id', this.garageId)
      .eq('status', 'completed')
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString());
      
    if (completedError) {
      console.error('Error fetching completed tickets for analytics:', completedError);
      return null;
    }
    
    return {
      period,
      totalAppointments: appointments?.length || 0,
      totalTickets: tickets?.length || 0,
      completedTickets: completedTickets?.length || 0,
      newClients: newClients?.length || 0,
      completionRate: tickets?.length ? (completedTickets?.length || 0) / tickets.length : 0
    };
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
