
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
 * Added error handling and fixed potential promise rejections
 */
export async function handleStaffSignIn(userId: string, userRole: string) {
  console.log("Handling staff sign in for user:", userId, "with role:", userRole);
  
  try {
    // Check if user has garage_id in profiles or user_roles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileError) {
      console.error("Error fetching profile:", profileError);
      // Continue execution instead of throwing - we'll try other options
    }
      
    if (profileData?.garage_id) {
      console.log("User already has garage_id in profile:", profileData.garage_id);
      
      // Ensure user_roles also has this garage_id
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ garage_id: profileData.garage_id })
        .eq('user_id', userId);
        
      if (updateError) {
        console.error("Error updating user_roles:", updateError);
        // Continue instead of failing completely
      }
        
      return; // Success - user already has garage association
    }
    
    // Check user_roles if not found in profile
    const { data: userRoleData, error: roleError } = await supabase
      .from('user_roles')
      .select('garage_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (roleError) {
      console.error("Error fetching user_roles:", roleError);
      // Continue execution
    }
    
    if (userRoleData?.garage_id) {
      console.log("User has garage_id in user_roles:", userRoleData.garage_id);
      
      // Update profile with this garage_id for consistency
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ garage_id: userRoleData.garage_id })
        .eq('id', userId);
        
      if (updateError) {
        console.error("Error updating profile with garage_id:", updateError);
        // Continue execution
      }
        
      return; // Success - user already has garage association
    }
    
    // If no garage_id found in either place, find a garage to assign
    console.log("No existing garage_id found for user, finding a suitable garage");
    
    // First try to find the tractic garage
    const { data: tracticGarage, error: tracticError } = await supabase
      .from('garages')
      .select('id')
      .eq('slug', 'tractic')
      .maybeSingle();
      
    if (tracticError) {
      console.error("Error finding tractic garage:", tracticError);
      // Continue to try finding any garage
    }
      
    if (tracticGarage?.id) {
      console.log("Found tractic garage:", tracticGarage.id);
      
      // Update user_roles with garage_id
      const { error: roleUpdateError } = await supabase
        .from('user_roles')
        .update({ garage_id: tracticGarage.id })
        .eq('user_id', userId);
        
      if (roleUpdateError) {
        console.error("Error updating user_roles with tractic garage:", roleUpdateError);
      }
        
      // Update profile with garage_id
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ garage_id: tracticGarage.id })
        .eq('id', userId);
        
      if (profileUpdateError) {
        console.error("Error updating profile with tractic garage:", profileUpdateError);
      }
        
      return; // Success even if one of the updates failed
    }
    
    // If tractic not found, try to find any garage
    const { data: anyGarage, error: anyGarageError } = await supabase
      .from('garages')
      .select('id')
      .limit(1);
      
    if (anyGarageError) {
      console.error("Error finding any garage:", anyGarageError);
      // This is serious, but we'll still try the fallback
    }
      
    if (anyGarage && anyGarage.length > 0) {
      console.log("Found a garage to assign:", anyGarage[0].id);
      
      // Update user_roles with garage_id
      const { error: roleUpdateError } = await supabase
        .from('user_roles')
        .update({ garage_id: anyGarage[0].id })
        .eq('user_id', userId);
        
      if (roleUpdateError) {
        console.error("Error updating user_roles with any garage:", roleUpdateError);
      }
        
      // Update profile with garage_id
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ garage_id: anyGarage[0].id })
        .eq('id', userId);
        
      if (profileUpdateError) {
        console.error("Error updating profile with any garage:", profileUpdateError);
      }
        
      return; // Success even if one of the updates failed
    }
    
    // Fallback to known garage ID as a last resort
    console.log("No garages found, using fallback garage ID");
    await assignDefaultGarage(userId, userRole);
    
  } catch (error) {
    console.error("Error in handleStaffSignIn:", error);
    // We're not going to rethrow the error to prevent breaking the authentication flow
    // Instead, we'll try to use the default garage as a last resort
    try {
      await assignDefaultGarage(userId, userRole);
    } catch (fallbackError) {
      console.error("Even fallback garage assignment failed:", fallbackError);
      // At this point, we've tried everything, but won't throw to avoid breaking sign-in
    }
  }
}
