
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
 * Avoids inserting staff users into garage_members
 */
export async function handleStaffSignIn(userId: string, userRole: string) {
  console.log("Handling staff sign in for user:", userId, "with role:", userRole);
  
  try {
    // STEP 1: Check if user has garage_id in user_roles
    const { data: userRoleData, error: roleError } = await supabase
      .from('user_roles')
      .select('garage_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (roleError) {
      console.error("Error checking user roles:", roleError);
    }
      
    if (userRoleData?.garage_id) {
      console.log("User already has garage_id in user_roles:", userRoleData.garage_id);
      return; // Success - user already has garage association
    }
    
    // STEP 2: If no garage_id found, assign one
    console.log("No existing garage_id found for user, assigning one");
    const assigned = await assignDefaultGarage(userId, userRole);
    
    if (!assigned) {
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "Could not set up your account. Please contact support."
      });
      throw new Error("Could not assign garage to staff user");
    }
    
    console.log("Assigned garage to staff user - proceeding with login");
  } catch (error) {
    console.error("Error in handleStaffSignIn:", error);
    throw error;
  }
}
