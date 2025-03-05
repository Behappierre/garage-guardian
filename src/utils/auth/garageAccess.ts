
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "@/types/garage";

/**
 * Gets all garages a user has access to through the garage_members table for owners
 * and user_roles table for staff
 */
export async function getAccessibleGarages(userId: string): Promise<Garage[]> {
  if (!userId) return [];
  
  try {
    console.log("Getting accessible garages for user:", userId);
    
    // First check if user is an owner in garage_members
    const { data: memberGarages, error: memberError } = await supabase
      .from('garage_members')
      .select(`
        garage:garage_id (
          id, 
          name, 
          slug, 
          address, 
          email, 
          phone, 
          created_at, 
          owner_id
        ),
        role
      `)
      .eq('user_id', userId)
      .eq('role', 'owner');
      
    if (memberError) {
      console.error("Error fetching garage_members:", memberError);
    }
    
    // Convert the data to Garage[] format
    const garages: Garage[] = [];
    
    // Add owner-associated garages from garage_members
    if (memberGarages && memberGarages.length > 0) {
      memberGarages.forEach(memberData => {
        if (memberData.garage) {
          garages.push({
            ...memberData.garage,
            relationship_type: memberData.role
          });
        }
      });
    }
    
    // If no owner garages found, check user_roles for staff
    if (garages.length === 0) {
      const { data: userRoleData, error: userRoleError } = await supabase
        .from('user_roles')
        .select(`
          id,
          role,
          garage:garage_id (
            id, 
            name, 
            slug, 
            address, 
            email, 
            phone, 
            created_at, 
            owner_id
          )
        `)
        .eq('user_id', userId)
        .not('garage_id', 'is', null);
        
      if (userRoleError) {
        console.error("Error fetching role garages:", userRoleError);
      }
      
      // Add role-associated garages
      if (userRoleData && userRoleData.length > 0) {
        userRoleData.forEach(roleData => {
          if (roleData.garage) {
            garages.push({
              ...roleData.garage,
              relationship_type: roleData.role
            });
          }
        });
      }
    }
    
    console.log("Accessible garages result:", garages.length);
    return garages;
  } catch (err) {
    console.error("Exception in getAccessibleGarages:", err);
    return [];
  }
}

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
