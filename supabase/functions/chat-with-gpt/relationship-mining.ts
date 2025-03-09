
/**
 * Functions for enhanced relationship mining across database tables
 * Provides a richer context for queries by traversing relationships
 */

export async function getClientFullHistory(clientId: string, supabase: any) {
  try {
    console.log(`Fetching full history for client: ${clientId}`);
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        vehicles(*),
        appointments(*)
      `)
      .eq('id', clientId)
      .single();
    
    if (error) {
      console.error('Error fetching client history:', error);
      return null;
    }
    
    console.log(`Successfully retrieved history for client: ${clientId}`);
    return data;
  } catch (err) {
    console.error('Exception in getClientFullHistory:', err);
    return null;
  }
}

export async function getClientAppointments(clientId: string, supabase: any) {
  try {
    console.log(`Fetching appointments for client: ${clientId}`);
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        vehicle:vehicles(*)
      `)
      .eq('client_id', clientId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching client appointments:', error);
      return null;
    }
    
    console.log(`Retrieved ${data?.length || 0} appointments for client: ${clientId}`);
    return data || [];
  } catch (err) {
    console.error('Exception in getClientAppointments:', err);
    return null;
  }
}

export async function getVehicleServiceHistory(vehicleId: string, supabase: any) {
  try {
    console.log(`Fetching service history for vehicle: ${vehicleId}`);
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        job_tickets(*),
        client:clients(*)
      `)
      .eq('id', vehicleId)
      .single();
    
    if (error) {
      console.error('Error fetching vehicle history:', error);
      return null;
    }
    
    console.log(`Successfully retrieved history for vehicle: ${vehicleId}`);
    return data;
  } catch (err) {
    console.error('Exception in getVehicleServiceHistory:', err);
    return null;
  }
}

export async function findSimilarVehicles(make: string, model: string, supabase: any, garageId?: string) {
  try {
    console.log(`Finding similar vehicles: ${make} ${model}, garage: ${garageId || 'any'}`);
    let query = supabase
      .from('vehicles')
      .select(`
        *,
        job_tickets(*)
      `)
      .eq('make', make)
      .eq('model', model)
      .limit(5);
    
    // If garage ID is provided, filter by garage
    if (garageId) {
      query = query.eq('garage_id', garageId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error finding similar vehicles:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} similar vehicles`);
    return data || [];
  } catch (err) {
    console.error('Exception in findSimilarVehicles:', err);
    return [];
  }
}

export async function getRelatedServiceHistory(vehicleId: string, serviceType: string, supabase: any) {
  try {
    console.log(`Getting related service history for vehicle ${vehicleId}, service type: ${serviceType}`);
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('make, model')
      .eq('id', vehicleId)
      .single();
      
    if (vehicleError || !vehicle) {
      console.error('Error fetching vehicle:', vehicleError);
      return [];
    }
    
    // Find similar service records for similar vehicles
    const { data, error } = await supabase
      .from('job_tickets')
      .select(`
        *,
        vehicle:vehicles(*)
      `)
      .eq('vehicles.make', vehicle.make)
      .eq('vehicles.model', vehicle.model)
      .ilike('description', `%${serviceType}%`)
      .limit(5);
    
    if (error) {
      console.error('Error fetching related service history:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} related service records`);
    return data || [];
  } catch (err) {
    console.error('Exception in getRelatedServiceHistory:', err);
    return [];
  }
}

export async function getJobTicketsByType(ticketType: string, supabase: any, garageId?: string) {
  try {
    console.log(`Getting job tickets by type: ${ticketType}, garage: ${garageId || 'any'}`);
    let query = supabase
      .from('job_tickets')
      .select(`
        *,
        client:clients(*),
        vehicle:vehicles(*)
      `)
      .eq('ticket_type', ticketType)
      .limit(10);
    
    // If garage ID is provided, filter by garage
    if (garageId) {
      query = query.eq('garage_id', garageId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching ${ticketType} tickets:`, error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} tickets of type ${ticketType}`);
    return data || [];
  } catch (err) {
    console.error(`Exception in getJobTicketsByType for ${ticketType}:`, err);
    return [];
  }
}
