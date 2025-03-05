
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { repairUserGarageRelationships } from "./garageAccess";

/**
 * Handles owner-specific sign-in logic with simplified approach
 */
export async function handleOwnerSignIn(userId: string) {
  console.log("Handling owner sign in for user:", userId);
  
  try {
    // First check if user already has a valid garage_id in user_roles
    const { data: userRoleData, error: roleError } = await supabase
      .from('user_roles')
      .select('garage_id, role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (roleError) {
      console.error("Error checking user roles:", roleError);
    }
    
    // If user has a garage_id in user_roles, verify it's valid
    if (userRoleData?.garage_id) {
      console.log("User already has garage_id in user_roles:", userRoleData.garage_id);
      
      // Update profile with this garage_id to ensure consistency
      await supabase
        .from('profiles')
        .update({ garage_id: userRoleData.garage_id })
        .eq('id', userId);
        
      console.log("Updated profile with existing garage_id - proceeding with login");
      return;
    }
    
    // Try to repair garage relationships if needed
    const relationshipsRepaired = await repairUserGarageRelationships(userId);
    console.log("Owner relationships repair attempt:", relationshipsRepaired);
    
    if (relationshipsRepaired) {
      console.log("Successfully repaired garage relationships");
      return;
    }
    
    // Check for owned garages as a fallback
    const { data: ownedGarages } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId);
    
    console.log("Owner sign in - owned garages:", JSON.stringify(ownedGarages));
      
    if (ownedGarages && ownedGarages.length > 0) {
      console.log("Owner has owned garages:", ownedGarages.length);
      
      // Update both user_roles and profiles with the garage_id
      const garageId = ownedGarages[0].id;
      
      // Update user_roles with garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: garageId })
        .eq('user_id', userId);
      
      // Update profile with garage_id
      await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userId);
        
      // Add user as member of their owned garage if not already
      // This is only relevant for owners who need to be in garage_members
      await supabase
        .from('garage_members')
        .upsert([{ 
          user_id: userId, 
          garage_id: garageId,
          role: 'owner'
        }]);
      
      console.log(`Successfully assigned user ${userId} to garage ${garageId}`);
      return;
    }
    
    // If no garage found at all, prompt user to create one
    console.log("No owned garages found - user will be prompted to create one");
    toast({
      title: "Welcome!",
      description: "You don't have any garages yet. Let's create your first one.",
    });
    
  } catch (error) {
    console.error("Error in handleOwnerSignIn:", error);
    // Continue execution, as this is not critical for navigation
    // The garage management page will show an empty state
  }
}
