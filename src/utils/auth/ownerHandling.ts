
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { repairUserGarageRelationships } from "./garageAccess";

/**
 * Handles owner-specific sign-in logic with focus on garage_members
 */
export async function handleOwnerSignIn(userId: string) {
  console.log("Handling owner sign in for user:", userId);
  
  try {
    // First check if user already has a valid garage in garage_members
    const { data: garageMemberData, error: memberError } = await supabase
      .from('garage_members')
      .select('garage_id, role')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();
    
    if (memberError) {
      console.error("Error checking garage_members:", memberError);
    }
    
    // If user has a garage_id in garage_members, use that
    if (garageMemberData?.garage_id) {
      console.log("User already has garage_id in garage_members:", garageMemberData.garage_id);
      
      // Update both user_roles and profile with this garage_id to ensure consistency
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ garage_id: garageMemberData.garage_id })
        .eq('user_id', userId);
        
      if (roleError) {
        console.error("Error updating user_roles with garage_id:", roleError);
      }
      
      // Update profile with this garage_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageMemberData.garage_id })
        .eq('id', userId);
        
      if (profileError) {
        console.error("Error updating profile with garage_id:", profileError);
      }
        
      console.log("Updated profile and user_roles with existing garage_id - proceeding with login");
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
      
      // Get first garage owned by user
      const garageId = ownedGarages[0].id;
      
      // Add user as owner in garage_members
      const { error: membershipError } = await supabase
        .from('garage_members')
        .upsert([{ 
          user_id: userId, 
          garage_id: garageId,
          role: 'owner'
        }]);
      
      if (membershipError) {
        console.error("Error adding user to garage_members:", membershipError);
      }
      
      // Update user_roles with garage_id
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ garage_id: garageId })
        .eq('user_id', userId);
      
      if (roleError) {
        console.error("Error updating user_roles with garage_id:", roleError);
      }
      
      // Update profile with garage_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userId);
      
      if (profileError) {
        console.error("Error updating profile with garage_id:", profileError);
      }
      
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
