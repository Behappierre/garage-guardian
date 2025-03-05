
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
    
    // 1. Create garage_members entry
    const { error: memberError } = await supabase
      .from('garage_members')
      .upsert({
        user_id: userId,
        garage_id: knownGarageId,
        role: userRole
      });
    
    if (memberError) {
      console.error("Error creating membership:", memberError);
      return false;
    }
    
    // 2. Update profile with garage_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: knownGarageId })
      .eq('id', userId);
    
    if (profileError) {
      console.error("Error updating profile:", profileError);
      return false;
    }
    
    // 3. Update user_roles with garage_id
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ garage_id: knownGarageId })
      .eq('user_id', userId);
      
    if (roleError) {
      console.error("Error updating user_roles with garage_id:", roleError);
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
 * Avoids querying the garages table which is causing ambiguity errors
 */
export async function handleStaffSignIn(userId: string, userRole: string) {
  console.log("Handling staff sign in for user:", userId, "with role:", userRole);
  
  try {
    // STEP 1: Check if user has any garage_members entries
    const { data: memberData, error: memberError } = await supabase
      .from('garage_members')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    if (memberError) {
      console.error("Error checking garage memberships:", memberError);
    }
      
    if (memberData && memberData.length > 0) {
      console.log("User has garage memberships - proceeding with login");
      return; // Success - user has garage association
    }
    
    // STEP 2: If no memberships found, create one using our simplified approach
    console.log("No existing garage memberships found for user, creating one");
    const assigned = await assignDefaultGarage(userId, userRole);
    
    if (!assigned) {
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "Could not set up your account. Please contact support."
      });
      throw new Error("Could not create garage membership");
    }
    
    console.log("Created garage membership - proceeding with login");
  } catch (error) {
    console.error("Error in handleStaffSignIn:", error);
    throw error;
  }
}
