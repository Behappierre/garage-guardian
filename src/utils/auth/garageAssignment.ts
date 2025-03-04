
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
    // User has no garage - don't try to assign one automatically
    console.log("User has no garage assignment");
    return false;
  }
}

/**
 * Attempts to assign a user to a specific garage
 */
export async function assignUserToGarage(userId: string, garageId: string, userRole: string) {
  if (!userId || !garageId) {
    console.error("Missing required user ID or garage ID");
    return false;
  }
  
  try {
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
  } catch (error) {
    console.error("Error assigning user to garage:", error);
    return false;
  }
}
