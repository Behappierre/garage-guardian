import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logGarageAssignmentError } from "./garageDiagnostics";

/**
 * Assigns a user to the default "tractic" garage or creates one if it doesn't exist
 * Only uses the user_roles table for garage association
 */
export async function assignDefaultGarage(userId: string, userRole: string): Promise<boolean> {
  try {
    console.log(`Attempting to assign default garage for user ${userId}`);
    
    // 1. Find the default garage with explicit table alias
    const { data: defaultGarageResult, error: garageError } = await supabase.rpc('execute_read_only_query', {
      query_text: `
        SELECT g.id 
        FROM garages g
        WHERE g.slug = 'tractic'
        LIMIT 1
      `
    });
    
    if (garageError || !defaultGarageResult || defaultGarageResult.length === 0) {
      console.error("Error or no default garage found:", garageError);
      throw new Error("Default garage not found");
    }
    
    const garageId = defaultGarageResult[0].id;
    console.log(`Found default garage: ${garageId}`);
    
    // 2. Add user as member with SEPARATE query (no joins)
    const { error: memberError } = await supabase
      .from('garage_members')
      .upsert([{
        user_id: userId,
        garage_id: garageId,
        role: userRole
      }]);
      
    if (memberError) {
      console.error("Error adding garage member:", memberError);
      throw new Error("Failed to add garage membership");
    }
    
    // 3. Update profile with SEPARATE query (no joins, no ambiguity)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
      
    if (profileError) {
      console.error("Error updating profile:", profileError);
      throw new Error("Failed to update profile");
    }
    
    // 4. Update user_roles with garage_id
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ garage_id: garageId })
      .eq('user_id', userId);
      
    if (roleError) {
      console.error("Error updating user_roles with garage_id:", roleError);
      throw new Error("Failed to update user roles");
    }
    
    console.log(`Successfully assigned user ${userId} to garage ${garageId}`);
    return true;
  } catch (error) {
    logGarageAssignmentError(error, "assignDefaultGarage");
    return false;
  }
}

/**
 * Handles staff-specific sign-in logic with improved error handling
 * Only uses the user_roles table for garage association
 */
export async function handleStaffSignIn(userId: string, userRole: string) {
  console.log("Handling staff sign in for user:", userId, "with role:", userRole);
  
  try {
    // Check if user already has a valid garage assignment in user_roles
    const { data: userRoleData } = await supabase
      .from('user_roles')
      .select('role, garage_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log("Staff user_role data:", JSON.stringify(userRoleData));
      
    // If user_role has a garage_id, verify it exists
    if (userRoleData?.garage_id) {
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', userRoleData.garage_id)
        .maybeSingle();
        
      if (garageExists) {
        console.log("Staff garage exists in user_role");
        return;
      } else {
        console.log("Garage in user_role doesn't exist, need to find or create a garage");
      }
    }
    
    // Try the improved assignDefaultGarage function
    const assigned = await assignDefaultGarage(userId, userRole);
    
    if (!assigned) {
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "Could not create or assign a default garage. Please contact support."
      });
      throw new Error("Could not create or assign a default garage");
    }
  } catch (error) {
    console.error("Error in handleStaffSignIn:", error);
    throw error; // Re-throw to be handled by the calling function
  }
}
