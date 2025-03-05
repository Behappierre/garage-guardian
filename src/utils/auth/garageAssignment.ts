
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a user has a garage assigned to their profile
 * Updated to use garage_members as source of truth
 */
export async function ensureUserHasGarage(userId: string, userRole: string) {
  console.log(`Ensuring user ${userId} with role ${userRole} has a garage assigned`);
  
  // First check if user has a garage in their profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('garage_id')
    .eq('id', userId)
    .single();
    
  if (profileData?.garage_id) {
    console.log("User has garage_id in profile:", profileData.garage_id);
    
    // Verify that this garage actually exists
    const { data: garageCheck, error: garageCheckError } = await supabase
      .from('garages')
      .select('id')
      .eq('id', profileData.garage_id)
      .single();
      
    if (garageCheckError && !garageCheckError.message.includes('No rows found')) {
      console.error("Error checking if garage exists:", garageCheckError);
    }
      
    if (garageCheck) {
      console.log("Verified garage exists:", garageCheck.id);
      
      // Make sure user is also in garage_members
      const { data: memberCheck } = await supabase
        .from('garage_members')
        .select('id')
        .eq('user_id', userId)
        .eq('garage_id', profileData.garage_id)
        .maybeSingle();
        
      if (!memberCheck) {
        console.log("Adding user to garage_members for consistency");
        await supabase
          .from('garage_members')
          .upsert([
            { 
              user_id: userId, 
              garage_id: profileData.garage_id, 
              role: userRole === 'administrator' ? 'owner' : userRole 
            }
          ]);
      }
      
      return true;
    } else {
      console.log("Garage ID in profile does not exist, will need to find another garage");
    }
  }
  
  // Check if user is a member of any garage
  const { data: memberData } = await supabase
    .from('garage_members')
    .select('garage_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (memberData && memberData.length > 0) {
    // Found a garage membership, update profile
    console.log("User is member of garage:", memberData[0].garage_id, "with role:", memberData[0].role);
    
    // Verify this garage actually exists
    const { data: memberGarageCheck, error: memberGarageError } = await supabase
      .from('garages')
      .select('id')
      .eq('id', memberData[0].garage_id)
      .single();
      
    if (memberGarageError && !memberGarageError.message.includes('No rows found')) {
      console.error("Error checking if member's garage exists:", memberGarageError);
    }
    
    if (memberGarageCheck) {
      console.log("Verified member's garage exists:", memberGarageCheck.id);
      
      await supabase
        .from('profiles')
        .update({ garage_id: memberData[0].garage_id })
        .eq('id', userId);
        
      return true;
    } else {
      console.log("Member's garage does not exist, checking for owned garages");
    }
  }
  
  // If user is an administrator, check if they own any garages
  if (userRole === 'administrator') {
    const { data: ownedGarages } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
      
    if (ownedGarages && ownedGarages.length > 0) {
      console.log("User owns garage:", ownedGarages[0].id);
      
      // Ensure user is a member of their owned garage
      await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: ownedGarages[0].id, role: 'owner' }
        ]);
        
      // Update profile with garage ID
      await supabase
        .from('profiles')
        .update({ garage_id: ownedGarages[0].id })
        .eq('id', userId);
        
      return true;
    }
  }
  
  // User has no garage
  console.log("User has no garage assignment");
  return false;
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
    console.log(`Assigning user ${userId} to garage ${garageId} with role ${userRole}`);
    
    // First verify the garage exists
    const { data: garageCheck, error: garageCheckError } = await supabase
      .from('garages')
      .select('id')
      .eq('id', garageId)
      .single();
    
    if (garageCheckError) {
      console.error("Error checking if garage exists:", garageCheckError);
      return false;
    }
    
    if (!garageCheck) {
      console.error("Garage does not exist:", garageId);
      return false;
    }
    
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
