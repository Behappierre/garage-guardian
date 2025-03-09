
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

export async function getClientFullHistory(clientId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        vehicles(
          *
        ),
        appointments:job_tickets(
          *,
          vehicle:vehicles(*)
        )
      `)
      .eq('id', clientId)
      .single();
    
    if (error) {
      console.error('Error fetching client history:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Exception in getClientFullHistory:', err);
    return null;
  }
}

export async function getVehicleServiceHistory(vehicleId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        job_tickets(
          *,
          assigned_technician:profiles(*),
          time_entries(*)
        ),
        client:clients(*)
      `)
      .eq('id', vehicleId)
      .single();
    
    if (error) {
      console.error('Error fetching vehicle history:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Exception in getVehicleServiceHistory:', err);
    return null;
  }
}

export async function findSimilarVehicles(make: string, model: string, supabase: any, garageId?: string) {
  try {
    let query = supabase
      .from('vehicles')
      .select(`
        *,
        job_tickets(
          description,
          status,
          created_at
        )
      `)
      .eq('make', make)
      .eq('model', model)
      .limit(10);
    
    // Apply garage filter if provided
    if (garageId) {
      query = query.eq('garage_id', garageId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error finding similar vehicles:', error);
      return [];
    }
    
    return data;
  } catch (err) {
    console.error('Exception in findSimilarVehicles:', err);
    return [];
  }
}

// Enhanced utility for getting common issues for a specific vehicle make/model
export async function getCommonIssuesForModel(make: string, model: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('job_tickets')
      .select(`
        description,
        status,
        vehicle:vehicles!inner(
          make,
          model
        )
      `)
      .eq('vehicles.make', make)
      .eq('vehicles.model', model)
      .limit(20);
    
    if (error) {
      console.error('Error fetching common issues:', error);
      return [];
    }
    
    // Process the data to extract common issues
    const issues = data || [];
    const issueCount: Record<string, number> = {};
    
    // Count occurrences of similar issues by looking for keyword patterns
    issues.forEach(ticket => {
      const description = ticket.description.toLowerCase();
      const keywords = ['brake', 'engine', 'transmission', 'electrical', 'oil', 'cooling', 'suspension'];
      
      keywords.forEach(keyword => {
        if (description.includes(keyword)) {
          issueCount[keyword] = (issueCount[keyword] || 0) + 1;
        }
      });
    });
    
    // Format the results
    const commonIssues = Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .map(([issue, count]) => ({ issue, count }));
      
    return {
      make,
      model,
      sampleSize: issues.length,
      commonIssues
    };
  } catch (err) {
    console.error('Exception in getCommonIssuesForModel:', err);
    return { make, model, sampleSize: 0, commonIssues: [] };
  }
}

// Get client appointments with full context
export async function getClientAppointments(clientId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        vehicle:vehicles(*),
        job_ticket:job_tickets(*)
      `)
      .eq('client_id', clientId)
      .order('start_time', { ascending: false });
    
    if (error) {
      console.error('Error fetching client appointments:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Exception in getClientAppointments:', err);
    return [];
  }
}
