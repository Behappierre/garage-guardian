
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a user has a garage assigned to their profile
 * Updated to use garage_members as source of truth
 */
export async function ensureUserHasGarage(userId: string, userRole: string) {
  console.log(`Ensuring user ${userId} with role ${userRole} has a garage assigned`);
  
  // First check if user has a garage in their profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('garage_id')
    .eq('id', userId)
    .single();
  
  console.log("Profile data:", JSON.stringify(profileData));
  console.log("Profile error:", profileError);
    
  if (profileData?.garage_id) {
    console.log("User has garage_id in profile:", profileData.garage_id);
    
    // Verify that this garage actually exists - use a more explicit query
    const { data: garageCheck, error: garageCheckError } = await supabase
      .from('garages')
      .select('id')
      .eq('id', profileData.garage_id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors
    
    console.log("Garage check result:", JSON.stringify(garageCheck));
    console.log("Garage check error:", garageCheckError);
      
    if (garageCheck) {
      console.log("Verified garage exists:", garageCheck.id);
      
      // Make sure user is also in garage_members
      const { data: memberCheck, error: memberCheckError } = await supabase
        .from('garage_members')
        .select('id')
        .eq('user_id', userId)
        .eq('garage_id', profileData.garage_id)
        .maybeSingle();
      
      console.log("Member check result:", JSON.stringify(memberCheck));
      console.log("Member check error:", memberCheckError);
        
      if (!memberCheck) {
        console.log("Adding user to garage_members for consistency");
        const { error: upsertError } = await supabase
          .from('garage_members')
          .upsert([
            { 
              user_id: userId, 
              garage_id: profileData.garage_id, 
              role: userRole === 'administrator' ? 'owner' : userRole 
            }
          ]);
        
        console.log("Garage member upsert error:", upsertError);
      }
      
      return true;
    } else {
      console.log("Garage ID in profile does not exist, will need to find another garage");
    }
  }
  
  // Check if user is a member of any garage
  const { data: memberData, error: memberDataError } = await supabase
    .from('garage_members')
    .select('garage_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  console.log("Member data:", JSON.stringify(memberData));
  console.log("Member data error:", memberDataError);
    
  if (memberData && memberData.length > 0) {
    // Found a garage membership, update profile
    console.log("User is member of garage:", memberData[0].garage_id, "with role:", memberData[0].role);
    
    // Verify this garage actually exists
    const { data: memberGarageCheck, error: memberGarageError } = await supabase
      .from('garages')
      .select('id')
      .eq('id', memberData[0].garage_id)
      .maybeSingle();
    
    console.log("Member garage check result:", JSON.stringify(memberGarageCheck));
    console.log("Member garage check error:", memberGarageError);
    
    if (memberGarageCheck) {
      console.log("Verified member's garage exists:", memberGarageCheck.id);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ garage_id: memberData[0].garage_id })
        .eq('id', userId);
      
      console.log("Profile update error:", updateError);
        
      return true;
    } else {
      console.log("Member's garage does not exist, checking for owned garages");
    }
  }
  
  // If user is an administrator, check if they own any garages
  if (userRole === 'administrator') {
    const { data: ownedGarages, error: ownedGaragesError } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    
    console.log("Owned garages:", JSON.stringify(ownedGarages));
    console.log("Owned garages error:", ownedGaragesError);
      
    if (ownedGarages && ownedGarages.length > 0) {
      console.log("User owns garage:", ownedGarages[0].id);
      
      // Ensure user is a member of their owned garage
      const { error: upsertError } = await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: ownedGarages[0].id, role: 'owner' }
        ]);
      
      console.log("Garage member upsert error:", upsertError);
        
      // Update profile with garage ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ garage_id: ownedGarages[0].id })
        .eq('id', userId);
      
      console.log("Profile update error:", updateError);
        
      return true;
    }
  }
  
  // Try to use default Tractic garage or create a new one as a last resort
  console.log("User has no garage assignment, trying to find a default garage");
  
  // Look for a default garage by slug
  const { data: defaultGarage, error: defaultGarageError } = await supabase
    .from('garages')
    .select('id')
    .eq('slug', 'tractic')
    .maybeSingle();
  
  console.log("Default garage:", JSON.stringify(defaultGarage));
  console.log("Default garage error:", defaultGarageError);
  
  if (defaultGarage) {
    console.log("Found default garage with slug 'tractic':", defaultGarage.id);
    
    // Assign user to this garage
    const { error: upsertError } = await supabase
      .from('garage_members')
      .upsert([
        { user_id: userId, garage_id: defaultGarage.id, role: userRole === 'administrator' ? 'owner' : userRole }
      ]);
    
    console.log("Garage member upsert error:", upsertError);
    
    // Update profile with garage ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ garage_id: defaultGarage.id })
      .eq('id', userId);
    
    console.log("Profile update error:", updateError);
    
    return true;
  }
  
  // User has no garage
  console.log("User has no garage assignment and no default garage found");
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
      .maybeSingle();
    
    console.log("Garage check result:", JSON.stringify(garageCheck));
    console.log("Garage check error:", garageCheckError);
    
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
    
    console.log("Garage member upsert error:", memberError);
      
    if (memberError) {
      console.error("Error adding user to garage:", memberError);
      return false;
    }
    
    // Update profile with garage ID
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
    
    console.log("Profile update error:", profileError);
      
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
