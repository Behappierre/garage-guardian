
import { supabase } from "@/integrations/supabase/client";
import { repairUserGarageRelationships } from "@/utils/auth/garageAccess";
import { toast } from "@/hooks/use-toast";
import { logGarageAssignmentError } from "./garageDiagnostics";

/**
 * Assigns a user to the default "tractic" garage or creates one if it doesn't exist
 * Leverages the new direct garage_id in user_roles table
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
      
      // Create a default garage
      const { data: newGarage, error: createError } = await supabase
        .from('garages')
        .insert({
          name: 'Default Garage',
          slug: 'default',
          owner_id: userId
        })
        .select()
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
    
    // 2. Update user_roles with garage_id - new direct association
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ garage_id: garageId })
      .eq('user_id', userId);
      
    if (roleError) {
      console.error("Error updating user_roles with garage_id:", roleError);
    }
    
    // 3. Add user as member - separate operation
    const { error: memberError } = await supabase
      .from('garage_members')
      .upsert({
        user_id: userId,
        garage_id: garageId,
        role: userRole || 'member'
      });
    
    if (memberError) {
      console.error("Error adding member:", memberError);
      return false;
    }
    
    // 4. Update profile with garage_id - separate operation
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
    
    if (profileError) {
      console.error("Error updating profile:", profileError);
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
 * Utilizes the new direct garage_id in user_roles table
 */
export async function handleStaffSignIn(userId: string, userRole: string) {
  console.log("Handling staff sign in for user:", userId, "with role:", userRole);
  
  try {
    // First check if user already has a valid garage assignment in user_roles
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
        console.log("Staff garage exists in user_role, ensuring profile and membership");
        
        // Ensure profile has the same garage_id
        await supabase
          .from('profiles')
          .update({ garage_id: userRoleData.garage_id })
          .eq('id', userId);
        
        // Ensure user is a member of this garage
        await supabase
          .from('garage_members')
          .upsert([{
            user_id: userId,
            garage_id: userRoleData.garage_id,
            role: userRole
          }]);
          
        return;
      } else {
        console.log("Garage in user_role doesn't exist, need to find or create a garage");
      }
    }
    
    // Next, check profile for a garage_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
    
    console.log("Staff profile data:", JSON.stringify(profileData));
      
    // If profile has a garage_id, verify it exists
    if (profileData?.garage_id) {
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', profileData.garage_id)
        .maybeSingle();
        
      if (garageExists) {
        console.log("Staff garage exists in profile, updating user_role and membership");
        
        // Update user_role with this garage_id
        await supabase
          .from('user_roles')
          .update({ garage_id: profileData.garage_id })
          .eq('user_id', userId);
        
        // Ensure user is a member of this garage
        await supabase
          .from('garage_members')
          .upsert([{
            user_id: userId,
            garage_id: profileData.garage_id,
            role: userRole
          }]);
          
        return;
      }
    }
      
    // Try to ensure user has a garage using repairUserGarageRelationships
    const hasGarage = await repairUserGarageRelationships(userId);
    console.log("Staff repairUserGarageRelationships result:", hasGarage);
    
    if (!hasGarage) {
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
      
      return;
    }
    
    // Re-verify that user_role now has a garage_id after repairs
    const { data: updatedUserRole } = await supabase
      .from('user_roles')
      .select('garage_id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (!updatedUserRole?.garage_id) {
      // Try fetching from profile as fallback
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', userId)
        .maybeSingle();
        
      if (updatedProfile?.garage_id) {
        // Update user_role with profile's garage_id
        await supabase
          .from('user_roles')
          .update({ garage_id: updatedProfile.garage_id })
          .eq('user_id', userId);
      } else {
        toast({
          variant: "destructive", 
          title: "System Error",
          description: "Failed to assign garage to your profile. Please contact support."
        });
        throw new Error("System error: Failed to assign garage to your profile. Please contact support.");
      }
    }
  } catch (error) {
    console.error("Error in handleStaffSignIn:", error);
    throw error; // Re-throw to be handled by the calling function
  }
}
