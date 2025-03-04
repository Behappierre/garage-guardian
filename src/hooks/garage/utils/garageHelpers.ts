
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "../types";

// Get garages by IDs - using proper SQL SELECT
export const getGaragesByIds = async (garageIds: string[]): Promise<Garage[]> => {
  if (garageIds.length === 0) {
    console.log("No garage IDs provided");
    return [];
  }
  
  try {
    console.log(`Fetching garages by IDs: ${garageIds.join(', ')}`);
    
    // Use the Supabase .in() method to fetch garages by IDs
    const { data, error } = await supabase
      .from('garages')
      .select('id, name, slug, address, created_at')
      .in('id', garageIds);
      
    if (error) {
      console.error("Error fetching garages by IDs:", error.message);
      return [];
    }
    
    console.log("Fetched garages:", data);
    
    if (!data || data.length === 0) {
      console.log("No garages found for the provided IDs");
      return [];
    }
    
    return data as Garage[];
  } catch (err) {
    console.error("Exception when getting garages by IDs:", err);
    return [];
  }
};

// Check if user is a garage owner
export const isGarageOwner = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'administrator')
      .single();
      
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Error checking if user is garage owner:", err);
    return false;
  }
};
