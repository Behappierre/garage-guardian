
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "@/types/garage";

/**
 * Gets all garages a user has access to through any relationship:
 * - As an owner (garages.owner_id)
 * - As a member (garage_members)
 * - Via profile assignment (profiles.garage_id)
 * - Via user role (user_roles.garage_id) - new direct association
 */
export async function getAccessibleGarages(userId: string): Promise<Garage[]> {
  if (!userId) return [];
  
  try {
    console.log("Getting accessible garages for user:", userId);
    
    // First, try to get owner relationships directly without using RPC
    const { data: ownedGarages, error: ownedError } = await supabase
      .from('garages')
      .select('id, name, slug, address, email, phone, created_at, owner_id')
      .eq('owner_id', userId);
      
    if (ownedError) {
      console.error("Error fetching owned garages:", ownedError);
    }
    
    // Then, get member relationships directly - Fix the select statement to avoid column ambiguity
    const { data: memberGarages, error: memberError } = await supabase
      .from('garage_members')
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
      .eq('user_id', userId);
      
    if (memberError) {
      console.error("Error fetching member garages:", memberError);
    }
    
    // Check user_roles table for direct garage association - Fix the select statement
    const { data: roleGarageData, error: roleGarageError } = await supabase
      .from('user_roles')
      .select(`
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
      
    if (roleGarageError) {
      console.error("Error fetching role garages:", roleGarageError);
    }
    
    // Finally, get profile relationship - Fix the select statement
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
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
      .eq('id', userId)
      .maybeSingle();
      
    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error fetching profile garage:", profileError);
    }
    
    // Combine all garage relationships
    const garages: Garage[] = [];
    
    // Add owned garages
    if (ownedGarages && ownedGarages.length > 0) {
      garages.push(...ownedGarages.map(garage => ({
        ...garage,
        relationship_type: 'owner'
      })));
    }
    
    // Add member garages
    if (memberGarages && memberGarages.length > 0) {
      memberGarages.forEach(membership => {
        if (membership.garage) {
          garages.push({
            ...membership.garage,
            relationship_type: membership.role
          });
        }
      });
    }
    
    // Add role-associated garages
    if (roleGarageData && roleGarageData.length > 0) {
      roleGarageData.forEach(roleData => {
        if (roleData.garage) {
          garages.push({
            ...roleData.garage,
            relationship_type: roleData.role
          });
        }
      });
    }
    
    // Add profile garage
    if (profileData?.garage) {
      garages.push({
        ...profileData.garage,
        relationship_type: 'profile'
      });
    }
    
    // Remove duplicates by id
    const uniqueGarages = garages.filter((garage, index, self) =>
      index === self.findIndex(g => g.id === garage.id)
    );
    
    console.log("Accessible garages result:", uniqueGarages);
    return uniqueGarages;
  } catch (err) {
    console.error("Exception in getAccessibleGarages:", err);
    return [];
  }
}

/**
 * Ensures a user has proper relationships to their garages
 * by fixing any missing associations
 */
export async function repairUserGarageRelationships(userId: string): Promise<boolean> {
  try {
    console.log("Repairing garage relationships for user:", userId);
    
    // Get all distinct garages the user has any relationship with
    const accessibleGarages = await getAccessibleGarages(userId);
    
    if (!accessibleGarages.length) {
      console.log("No garages found to repair relationships for");
      return false;
    }
    
    console.log(`Found ${accessibleGarages.length} garages to ensure relationships for`);
    
    // Get user's current profile data
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
      
    // Check user's role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, garage_id')
      .eq('user_id', userId)
      .maybeSingle();
      
    const userRole = roleData?.role || 'front_desk';
    const isAdmin = userRole === 'administrator';
    
    // For each garage, ensure proper relationships exist
    for (const garage of accessibleGarages) {
      // Determine appropriate role in garage_members
      let roleInGarage = 'member';
      
      if (isAdmin && garage.owner_id === userId) {
        roleInGarage = 'owner';
      } else if (userRole === 'technician') {
        roleInGarage = 'technician';
      } else if (userRole === 'front_desk') {
        roleInGarage = 'front_desk';
      }
      
      // Ensure membership record
      await supabase
        .from('garage_members')
        .upsert({ 
          user_id: userId, 
          garage_id: garage.id, 
          role: roleInGarage 
        });
      
      // Update user_roles table with garage_id if it's missing
      if (!roleData?.garage_id) {
        await supabase
          .from('user_roles')
          .update({ garage_id: garage.id })
          .eq('user_id', userId);
      }
        
      console.log(`Ensured membership for garage ${garage.id} with role ${roleInGarage}`);
    }
    
    // If profile doesn't have a garage_id, set it to the first garage
    if (!profileData?.garage_id && accessibleGarages.length > 0) {
      const firstGarage = accessibleGarages[0];
      
      await supabase
        .from('profiles')
        .update({ garage_id: firstGarage.id })
        .eq('id', userId);
        
      console.log(`Updated profile with garage_id: ${firstGarage.id}`);
    }
    
    return true;
  } catch (err) {
    console.error("Error repairing garage relationships:", err);
    return false;
  }
}
