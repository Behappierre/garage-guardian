
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a user has proper relationship to their garage
 * by fixing any missing associations
 */
export async function repairUserGarageRelationships(userId: string): Promise<boolean> {
  try {
    console.log("Repairing garage relationships for user:", userId);
    
    // First check if user is an owner in garage_members
    const { data: memberData } = await supabase
      .from('garage_members')
      .select('garage_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();
      
    if (memberData?.garage_id) {
      console.log(`User is an owner of garage: ${memberData.garage_id}`);
      
      // Update profile with this garage_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: memberData.garage_id })
        .eq('id', userId);
        
      if (profileError) {
        console.error("Error updating profile with garage_id:", profileError);
      }
      
      return true;
    }
    
    // If no garage found as owner, check user_roles
    const { data: userRoleData } = await supabase
      .from('user_roles')
      .select('role, garage_id')
      .eq('user_id', userId)
      .maybeSingle();
      
    // If user already has a garage_id in user_roles, verify it exists
    if (userRoleData?.garage_id) {
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', userRoleData.garage_id)
        .maybeSingle();
        
      if (garageExists) {
        console.log(`User already has valid garage_id: ${userRoleData.garage_id}`);
        
        // Update profile with this garage_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ garage_id: userRoleData.garage_id })
          .eq('id', userId);
          
        if (profileError) {
          console.error("Error updating profile with garage_id:", profileError);
        }
        
        return true;
      }
    }
    
    // If no valid garage found, try to find any garage
    const { data: anyGarage } = await supabase
      .from('garages')
      .select('id')
      .limit(1)
      .maybeSingle();
      
    if (anyGarage) {
      console.log(`Assigning garage ${anyGarage.id} to user`);
      
      // Update profile with this garage_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ garage_id: anyGarage.id })
        .eq('id', userId);
        
      if (profileError) {
        console.error("Error updating profile with garage_id:", profileError);
      }
      
      return true;
    }
    
    // No garage found at all
    console.log("No garage found to repair relationship");
    return false;
  } catch (err) {
    console.error("Error repairing garage relationships:", err);
    return false;
  }
}
