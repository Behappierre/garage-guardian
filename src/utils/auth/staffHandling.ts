
import { supabase } from "@/integrations/supabase/client";
import { repairUserGarageRelationships } from "@/utils/auth/garageAccess";
import { ensureUserHasGarage } from "@/utils/auth/garageAssignment";
import { toast } from "@/hooks/use-toast";
import { logGarageAssignmentError } from "./garageDiagnostics";

/**
 * Assigns a user to the default "tractic" garage or creates one if it doesn't exist
 * Uses simpler, separate queries to avoid ambiguous column references
 */
export async function assignDefaultGarage(userId: string, userRole: string): Promise<boolean> {
  try {
    console.log("Attempting to assign default garage for user:", userId);
    
    // 1. First try to find the default "tractic" garage - simplified query
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
    
    // 2. Add user as member - separate operation
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
    
    // 3. Update profile with garage_id - separate operation
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
 * Uses simpler queries to avoid ambiguous column references
 */
export async function handleStaffSignIn(userId: string, userRole: string) {
  console.log("Handling staff sign in for user:", userId, "with role:", userRole);
  
  try {
    // First check if user already has a valid garage assignment
    // Simple profile query without joins
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
    
    console.log("Staff profile data:", JSON.stringify(profileData));
      
    // If profile has a garage_id, verify it exists - separate query
    if (profileData?.garage_id) {
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', profileData.garage_id)
        .maybeSingle();
        
      if (garageExists) {
        console.log("Staff garage exists, ensuring membership");
        
        // Ensure user is a member of this garage
        await supabase
          .from('garage_members')
          .upsert([{
            user_id: userId,
            garage_id: profileData.garage_id,
            role: userRole
          }]);
          
        return;
      } else {
        console.log("Garage in profile doesn't exist, need to find or create a garage");
      }
    }
      
    // Try to ensure user has a garage using simplified approach
    const hasGarage = await ensureUserHasGarage(userId, userRole);
    console.log("Staff ensureUserHasGarage result:", hasGarage);
    
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
    
    // Re-verify that profile now has a garage_id after ensureUserHasGarage
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
      
    if (!updatedProfile?.garage_id) {
      toast({
        variant: "destructive", 
        title: "System Error",
        description: "Failed to assign garage to your profile. Please contact support."
      });
      throw new Error("System error: Failed to assign garage to your profile. Please contact support.");
    }
  } catch (error) {
    console.error("Error in handleStaffSignIn:", error);
    throw error; // Re-throw to be handled by the calling function
  }
}
