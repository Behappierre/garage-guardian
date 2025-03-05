
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "@/types/garage";

/**
 * Get all garages accessible to a user, bypassing RLS
 */
export async function getUserGarages(userId: string): Promise<Garage[]> {
  if (!userId) {
    console.error("Missing user ID in getUserGarages");
    return [];
  }
  
  try {
    // Use a single SQL query that bypasses potentially conflicting RLS policies
    const { data: results, error } = await supabase.rpc('execute_read_only_query', {
      query_text: `
        SELECT DISTINCT g.* FROM garages g
        LEFT JOIN garage_members gm ON g.id = gm.garage_id
        LEFT JOIN profiles p ON g.id = p.garage_id
        WHERE 
          g.owner_id = '${userId}' OR
          gm.user_id = '${userId}' OR
          (p.id = '${userId}' AND p.garage_id IS NOT NULL)
      `
    });
    
    if (error) {
      console.error("Error fetching user garages:", error);
      return [];
    }
    
    if (!results || !Array.isArray(results)) {
      console.log("No valid garages found for user:", userId);
      return [];
    }
    
    return results as Garage[];
  } catch (error) {
    console.error("Exception in getUserGarages:", error);
    return [];
  }
}

/**
 * Check if a user has access to a specific garage
 */
export async function userHasGarageAccess(userId: string, garageId: string): Promise<boolean> {
  if (!userId || !garageId) return false;
  
  try {
    const { data: result, error } = await supabase.rpc('execute_read_only_query', {
      query_text: `
        SELECT EXISTS (
          SELECT 1 FROM garages g
          LEFT JOIN garage_members gm ON g.id = gm.garage_id
          LEFT JOIN profiles p ON g.id = p.garage_id
          WHERE 
            g.id = '${garageId}' AND
            (g.owner_id = '${userId}' OR
             gm.user_id = '${userId}' OR
             (p.id = '${userId}' AND p.garage_id = '${garageId}'))
        ) AS has_access
      `
    });
    
    if (error || !result || !Array.isArray(result) || result.length === 0) {
      return false;
    }
    
    return !!result[0].has_access;
  } catch (error) {
    console.error("Error checking garage access:", error);
    return false;
  }
}

/**
 * Get a user's default garage (first available)
 */
export async function getUserDefaultGarage(userId: string): Promise<Garage | null> {
  const garages = await getUserGarages(userId);
  
  if (garages && garages.length > 0) {
    return garages[0];
  }
  
  // Try to find the default tractic garage
  try {
    const { data: defaultGarage } = await supabase.rpc('execute_read_only_query', {
      query_text: `SELECT * FROM garages WHERE slug = 'tractic' LIMIT 1`
    });
    
    if (defaultGarage && Array.isArray(defaultGarage) && defaultGarage.length > 0) {
      // Associate user with this garage
      await supabase.from('garage_members')
        .upsert([{ 
          user_id: userId, 
          garage_id: defaultGarage[0].id,
          role: 'member'
        }]);
        
      // Update profile
      await supabase.from('profiles')
        .update({ garage_id: defaultGarage[0].id })
        .eq('id', userId);
        
      return defaultGarage[0] as Garage;
    }
  } catch (error) {
    console.error("Error finding default garage:", error);
  }
  
  return null;
}
