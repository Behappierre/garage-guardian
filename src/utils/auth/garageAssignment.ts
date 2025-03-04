
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a user has a garage assigned to their profile
 * Updated to use garage_members as source of truth
 */
export async function ensureUserHasGarage(userId: string, userRole: string) {
  // Check if user is a member of any garage
  const { data: memberData } = await supabase
    .from('garage_members')
    .select('garage_id')
    .eq('user_id', userId)
    .limit(1);
    
  if (memberData && memberData.length > 0) {
    // User already has a garage assignment
    return true;
  } else {
    // Try to assign user to a garage
    return await assignUserToDefaultGarage(userId, userRole);
  }
}

/**
 * Attempts to assign a user to the default 'tractic' garage or any available garage
 */
export async function assignUserToDefaultGarage(userId: string, userRole: string) {
  // Try to use default Tractic garage - fix the column reference
  const { data: defaultGarage } = await supabase
    .from('garages')
    .select('id')  // Fix: Use simple 'id' instead of 'garages.id'
    .eq('slug', 'tractic')
    .limit(1);
    
  if (defaultGarage && defaultGarage.length > 0) {
    const defaultGarageId = defaultGarage[0].id;
    
    // Add user as member
    const { error: memberError } = await supabase
      .from('garage_members')
      .upsert([
        { user_id: userId, garage_id: defaultGarageId, role: userRole }
      ]);
      
    if (memberError) {
      console.error("Error adding user to default garage:", memberError);
      return false;
    }
    
    return true;
  } else {
    // If no default garage, find any available garage
    const { data: anyGarage } = await supabase
      .from('garages')
      .select('id')  // Fix: Use simple 'id' instead of 'garages.id'
      .limit(1);
      
    if (anyGarage && anyGarage.length > 0) {
      const garageId = anyGarage[0].id;
      
      // Add user as member
      const { error: memberError } = await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: garageId, role: userRole }
        ]);
        
      if (memberError) {
        console.error("Error adding user to garage:", memberError);
        return false;
      }
      
      return true;
    }
  }
  
  return false;
}
