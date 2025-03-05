
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "@/types/garage";
import { logGarageAssignmentError } from "./garageDiagnostics";

/**
 * Ensures a user has a garage assigned to their profile
 * Using a simplified approach to reduce complexity and avoid ambiguous column references
 */
export async function ensureUserHasGarage(userId: string, userRole: string) {
  console.log(`Ensuring user ${userId} with role ${userRole} has a garage assigned`);
  
  try {
    // CHECK 1: First check for a valid garage in the user's profile - simple query
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
    
    console.log("Profile data:", JSON.stringify(profileData));
    
    if (profileData?.garage_id) {
      console.log("User has garage_id in profile:", profileData.garage_id);
      
      // Verify this garage exists - separate query
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', profileData.garage_id)
        .maybeSingle();
      
      console.log("Garage existence check:", JSON.stringify(garageExists));
        
      if (garageExists) {
        console.log("Verified garage exists:", garageExists.id);
        
        // Ensure user is in garage_members for this garage - separate operation
        const { error: memberError } = await supabase
          .from('garage_members')
          .upsert([
            { 
              user_id: userId, 
              garage_id: profileData.garage_id, 
              role: userRole === 'administrator' ? 'owner' : userRole 
            }
          ]);
        
        if (memberError) {
          console.error("Error ensuring garage membership:", memberError);
        }
        
        return true;
      }
      
      console.log("Garage in profile does not exist, will try other options");
    }
    
    // CHECK 2: Check if user is a member of any garage - simple query
    const { data: membershipData } = await supabase
      .from('garage_members')
      .select('garage_id, role')
      .eq('user_id', userId);
    
    console.log("Membership data:", JSON.stringify(membershipData));
    
    if (membershipData && membershipData.length > 0) {
      // Pick the first garage membership
      const garageId = membershipData[0].garage_id;
      console.log("User is member of garage:", garageId);
      
      // Verify this garage exists - separate query
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', garageId)
        .maybeSingle();
      
      if (garageExists) {
        console.log("Verified member's garage exists:", garageExists.id);
        
        // Update profile with garage_id - separate operation
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ garage_id: garageId })
          .eq('id', userId);
        
        if (updateError) {
          console.error("Error updating profile with garage_id:", updateError);
        }
        
        return true;
      }
    }
    
    // CHECK 3: If user is an administrator, check for owned garages - simple query
    if (userRole === 'administrator') {
      console.log("Checking if admin owns any garages");
      
      const { data: ownedGarages } = await supabase
        .from('garages')
        .select('id')
        .eq('owner_id', userId);
      
      console.log("Owned garages:", JSON.stringify(ownedGarages));
      
      if (ownedGarages && ownedGarages.length > 0) {
        const garageId = ownedGarages[0].id;
        console.log("Admin owns garage:", garageId);
        
        // Make sure admin is a member of their owned garage - separate operation
        const { error: memberError } = await supabase
          .from('garage_members')
          .upsert([
            { user_id: userId, garage_id: garageId, role: 'owner' }
          ]);
        
        if (memberError) {
          console.error("Error upserting garage member:", memberError);
        }
        
        // Update profile - separate operation
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ garage_id: garageId })
          .eq('id', userId);
        
        if (updateError) {
          console.error("Error updating profile for admin:", updateError);
        }
        
        return true;
      }
    }
    
    // CHECK 4: Look for a default garage by slug - simple query
    console.log("Checking for default 'tractic' garage");
    
    const { data: defaultGarage } = await supabase
      .from('garages')
      .select('id')
      .eq('slug', 'tractic')
      .maybeSingle();
    
    console.log("Default garage check:", JSON.stringify(defaultGarage));
    
    if (defaultGarage) {
      console.log("Found default 'tractic' garage:", defaultGarage.id);
      
      // Add user as member - separate operation
      const { error: memberError } = await supabase
        .from('garage_members')
        .upsert([
          { 
            user_id: userId, 
            garage_id: defaultGarage.id, 
            role: userRole === 'administrator' ? 'owner' : userRole 
          }
        ]);
      
      if (memberError) {
        console.error("Error adding user to default garage:", memberError);
      }
      
      // Update profile - separate operation
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ garage_id: defaultGarage.id })
        .eq('id', userId);
      
      if (updateError) {
        console.error("Error updating profile with default garage:", updateError);
      }
      
      return true;
    }
    
    // CHECK 5: Last resort - find any garage in the system - simple query
    console.log("Looking for any garage as last resort");
    
    const { data: anyGarage } = await supabase
      .from('garages')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    console.log("Any garage check:", JSON.stringify(anyGarage));
    
    if (anyGarage) {
      console.log("Found a garage to assign:", anyGarage.id);
      
      // Add user as member - separate operation
      const { error: memberError } = await supabase
        .from('garage_members')
        .upsert([
          { 
            user_id: userId, 
            garage_id: anyGarage.id, 
            role: userRole === 'administrator' ? 'owner' : userRole 
          }
        ]);
      
      if (memberError) {
        console.error("Error adding user to last resort garage:", memberError);
      }
      
      // Update profile - separate operation
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ garage_id: anyGarage.id })
        .eq('id', userId);
      
      if (updateError) {
        console.error("Error updating profile with last resort garage:", updateError);
      }
      
      return true;
    }
    
    // No garage found
    console.log("No garage found in the system");
    return false;
  
  } catch (error) {
    logGarageAssignmentError(error, "ensureUserHasGarage");
    return false;
  }
}

/**
 * Assigns a user to a specific garage
 */
export async function assignUserToGarage(userId: string, garageId: string, userRole: string) {
  if (!userId || !garageId) {
    console.error("Missing required user ID or garage ID");
    return false;
  }
  
  try {
    console.log(`Assigning user ${userId} to garage ${garageId} with role ${userRole}`);
    
    // Verify the garage exists - separate query
    const { data: garageCheck } = await supabase
      .from('garages')
      .select('id')
      .eq('id', garageId)
      .maybeSingle();
    
    console.log("Garage check result:", JSON.stringify(garageCheck));
    
    if (!garageCheck) {
      console.error("Garage does not exist:", garageId);
      return false;
    }
    
    // Add user as member - separate operation
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
    
    // Update profile with garage ID - separate operation
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
    logGarageAssignmentError(error, "assignUserToGarage");
    return false;
  }
}
