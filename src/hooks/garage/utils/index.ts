
// Import necessary dependencies
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "../types";

// Get list of garage IDs a user has membership in
export const getUserGarageMemberships = async (userId: string): Promise<string[]> => {
  try {
    const garageIds: string[] = [];
    
    // First check for garages where user is the owner
    const { data: ownedGarages, error: ownedError } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId);
    
    if (ownedError) {
      console.error("Error fetching owned garages:", ownedError.message);
    } else if (ownedGarages) {
      ownedGarages.forEach(garage => garageIds.push(garage.id));
    }
    
    // Then check for garages where user is a member
    const { data: memberships, error: membershipError } = await supabase
      .from('garage_members')
      .select('garage_id')
      .eq('user_id', userId);
      
    if (membershipError) {
      console.error("Error fetching garage memberships:", membershipError.message);
    } else if (memberships) {
      memberships.forEach(membership => {
        if (!garageIds.includes(membership.garage_id)) {
          garageIds.push(membership.garage_id);
        }
      });
    }
    
    return garageIds;
  } catch (err) {
    console.error("Exception in getUserGarageMemberships:", err);
    return [];
  }
};

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
      .select('id, name, slug, address, created_at, owner_id')
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
