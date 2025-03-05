
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "@/types/garage";

/**
 * Gets all garages a user has access to through any relationship:
 * - As an owner (garages.owner_id)
 * - As a member (garage_members)
 * - Via profile assignment (profiles.garage_id)
 */
export async function getAccessibleGarages(userId: string): Promise<Garage[]> {
  if (!userId) return [];
  
  try {
    console.log("Getting accessible garages for user:", userId);
    
    // This query considers ALL possible relationships at once - FIX: avoid ambiguous column references
    const { data, error } = await supabase.rpc('execute_read_only_query', {
      query_text: `
        WITH user_garages AS (
          -- Owner relationships
          SELECT g.id, g.name, g.slug, g.address, g.email, g.phone, g.created_at, g.owner_id, 'owner' AS relationship_type
          FROM garages g
          WHERE g.owner_id = '${userId}'::uuid
          
          UNION
          
          -- Member relationships
          SELECT g.id, g.name, g.slug, g.address, g.email, g.phone, g.created_at, g.owner_id, gm.role AS relationship_type
          FROM garages g
          JOIN garage_members gm ON g.id = gm.garage_id
          WHERE gm.user_id = '${userId}'::uuid
          
          UNION
          
          -- Profile relationships
          SELECT g.id, g.name, g.slug, g.address, g.email, g.phone, g.created_at, g.owner_id, 'profile' AS relationship_type
          FROM garages g
          JOIN profiles p ON g.id = p.garage_id
          WHERE p.id = '${userId}'::uuid AND p.garage_id IS NOT NULL
        )
        SELECT DISTINCT id, name, slug, address, email, phone, created_at, owner_id
        FROM user_garages
      `
    });
    
    if (error) {
      console.error("Error fetching accessible garages:", error);
      return [];
    }
    
    console.log("Accessible garages result:", data);
    return (data || []) as Garage[];
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
      .select('role')
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
