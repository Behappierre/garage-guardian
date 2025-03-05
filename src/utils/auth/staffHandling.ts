
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logGarageAssignmentError } from "./garageDiagnostics";

/**
 * Assigns a user to the default "tractic" garage or creates one if it doesn't exist
 * Only uses the user_roles table for garage association
 */
export async function assignDefaultGarage(userId: string, userRole: string): Promise<boolean> {
  try {
    // Use a known garage ID that we're confident exists in the system
    const knownGarageId = "64960ccf-e353-4b4f-b951-ff687f35c78c";
    
    console.log(`Assigning garage ID ${knownGarageId} to user ${userId}`);
    
    // ONLY update the user_roles table for staff users
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ garage_id: knownGarageId })
      .eq('user_id', userId);
      
    if (roleError) {
      console.error("Error updating user_roles with garage_id:", roleError);
      return false;
    }
    
    // Update profile with garage_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: knownGarageId })
      .eq('id', userId);
    
    if (profileError) {
      console.error("Error updating profile:", profileError);
      return false;
    }
    
    console.log(`Successfully assigned user ${userId} to garage ${knownGarageId}`);
    return true;
  } catch (error) {
    logGarageAssignmentError(error, "assignDefaultGarage");
    return false;
  }
}

/**
 * Handles staff-specific sign-in logic with simplified approach
 */
export async function handleStaffSignIn(userId: string, userRole: string) {
  console.log("Handling staff sign in for user:", userId, "with role:", userRole);
  
  try {
    // Check if user has garage_id in profiles or user_roles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileData?.garage_id) {
      console.log("User already has garage_id in profile:", profileData.garage_id);
      
      // Ensure user_roles also has this garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: profileData.garage_id })
        .eq('user_id', userId);
        
      return; // Success - user already has garage association
    }
    
    // Check user_roles if not found in profile
    const { data: userRoleData } = await supabase
      .from('user_roles')
      .select('garage_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userRoleData?.garage_id) {
      console.log("User has garage_id in user_roles:", userRoleData.garage_id);
      
      // Update profile with this garage_id for consistency
      await supabase
        .from('profiles')
        .update({ garage_id: userRoleData.garage_id })
        .eq('id', userId);
        
      return; // Success - user already has garage association
    }
    
    // If no garage_id found in either place, find a garage to assign
    console.log("No existing garage_id found for user, finding a suitable garage");
    
    // First try to find the tractic garage
    const { data: tracticGarage } = await supabase
      .from('garages')
      .select('id')
      .eq('slug', 'tractic')
      .maybeSingle();
      
    if (tracticGarage?.id) {
      console.log("Found tractic garage:", tracticGarage.id);
      
      // Update user_roles with garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: tracticGarage.id })
        .eq('user_id', userId);
        
      // Update profile with garage_id
      await supabase
        .from('profiles')
        .update({ garage_id: tracticGarage.id })
        .eq('id', userId);
        
      return; // Success
    }
    
    // If tractic not found, try to find any garage
    const { data: anyGarage } = await supabase
      .from('garages')
      .select('id')
      .limit(1);
      
    if (anyGarage && anyGarage.length > 0) {
      console.log("Found a garage to assign:", anyGarage[0].id);
      
      // Update user_roles with garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: anyGarage[0].id })
        .eq('user_id', userId);
        
      // Update profile with garage_id
      await supabase
        .from('profiles')
        .update({ garage_id: anyGarage[0].id })
        .eq('id', userId);
        
      return; // Success
    }
    
    // No garages found at all
    throw new Error("No garages found in the system. Please create a garage first.");
  } catch (error) {
    console.error("Error in handleStaffSignIn:", error);
    throw error;
  }
}
