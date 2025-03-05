
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a user has a garage assigned to their profile
 * Updated to use garage_members as source of truth
 */
export async function ensureUserHasGarage(userId: string, userRole: string) {
  // First check if user has a garage in their profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('garage_id')
    .eq('id', userId)
    .single();
    
  if (profileData?.garage_id) {
    console.log("User has garage_id in profile:", profileData.garage_id);
    return true;
  }
  
  // Check if user is a member of any garage
  const { data: memberData } = await supabase
    .from('garage_members')
    .select('garage_id')
    .eq('user_id', userId)
    .limit(1);
    
  if (memberData && memberData.length > 0) {
    // Found a garage membership, update profile
    console.log("User is member of garage:", memberData[0].garage_id);
    
    await supabase
      .from('profiles')
      .update({ garage_id: memberData[0].garage_id })
      .eq('id', userId);
      
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
    
    // Update profile with garage ID
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
      
    if (profileError) {
      console.error("Error updating profile with garage ID:", profileError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error assigning user to garage:", error);
    return false;
  }
}
