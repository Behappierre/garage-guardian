
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logGarageAssignmentError } from "./garageDiagnostics";

/**
 * Assigns a user to the default "tractic" garage or creates one if it doesn't exist
 * Only uses the user_roles table for garage association
 */
export async function assignDefaultGarage(userId: string, userRole: string): Promise<boolean> {
  try {
    console.log("Attempting to assign default garage for user:", userId);
    
    // 1. First try to find the default "tractic" garage
    const { data: defaultGarageData } = await supabase
      .from('garages')
      .select('id')
      .eq('slug', 'tractic')
      .maybeSingle();
    
    let garageId: string | null = defaultGarageData?.id || null;
    
    // If no default garage found, try to find any garage
    if (!garageId) {
      console.log("Default 'tractic' garage not found, checking for any garage");
      
      const { data: anyGarageData } = await supabase
        .from('garages')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      garageId = anyGarageData?.id || null;
    }
    
    // If still no garage found, create a default one
    if (!garageId) {
      console.log("No garages found, creating a default one");
      
      // Create a default garage with explicit column selection
      const { data: newGarage, error: createError } = await supabase
        .from('garages')
        .insert({
          name: 'Default Garage',
          slug: 'default',
          owner_id: userId
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error("Error creating default garage:", createError);
        return false;
      }
      
      garageId = newGarage.id;
      console.log("Created new default garage with ID:", garageId);
    }
    
    if (!garageId) {
      console.error("Failed to find or create a garage");
      return false;
    }
    
    console.log("Using garage ID:", garageId);
    
    // Only update the user_roles table with garage_id - explicit column references
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ garage_id: garageId })
      .eq('user_id', userId);
      
    if (roleError) {
      console.error("Error updating user_roles with garage_id:", roleError);
      return false;
    }
    
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
