
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "@/types/garage";

/**
 * Gets all garages accessible to a user through any relationship
 */
export async function getAccessibleGarages(userId: string): Promise<Garage[]> {
  if (!userId) return [];
  
  try {
    console.log(`Getting accessible garages for user: ${userId}`);
    
    // Use separate queries and combine results to avoid ambiguous column issues
    const allGarages = new Map(); // Use Map to ensure unique garages by ID
    
    // 1. Try to get garages where the user has administrator role
    try {
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('garage_id')
        .eq('user_id', userId)
        .eq('role', 'administrator');
        
      if (adminRoles?.length > 0) {
        for (const role of adminRoles) {
          if (role.garage_id) {
            // Get garage details in a separate query
            const { data: garageDetails } = await supabase
              .from('garages')
              .select('id, name, slug, address, email, phone, created_at, owner_id')
              .eq('id', role.garage_id)
              .single();
            
            if (garageDetails) {
              allGarages.set(role.garage_id, {
                ...garageDetails,
                relationship_type: 'administrator'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching administrator garages:", error);
    }
    
    // 2. Try to get garages the user is a member of
    try {
      const { data: memberGarages } = await supabase
        .from('garage_members')
        .select('garage_id, role')
        .eq('user_id', userId);
        
      if (memberGarages?.length > 0) {
        for (const member of memberGarages) {
          if (!allGarages.has(member.garage_id)) {
            // Only fetch if we don't already have this garage
            const { data: garageDetails } = await supabase
              .from('garages')
              .select('id, name, slug, address, email, phone, created_at, owner_id')
              .eq('id', member.garage_id)
              .single();
              
            if (garageDetails) {
              allGarages.set(member.garage_id, {
                ...garageDetails,
                relationship_type: member.role
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching member garages:", error);
    }
    
    // 3. Try to get the garage from the user's profile
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', userId)
        .maybeSingle();
        
      if (profileData?.garage_id && !allGarages.has(profileData.garage_id)) {
        const { data: garageDetails } = await supabase
          .from('garages')
          .select('id, name, slug, address, email, phone, created_at, owner_id')
          .eq('id', profileData.garage_id)
          .single();
          
        if (garageDetails) {
          allGarages.set(profileData.garage_id, {
            ...garageDetails,
            relationship_type: 'profile'
          });
        }
      }
    } catch (error) {
      console.error("Error fetching profile garage:", error);
    }
    
    // Convert Map to array for return
    const garages: Garage[] = Array.from(allGarages.values());
    console.log(`Accessible garages found: ${garages.length}`);
    
    // We're removing the default garage fallback
    // This will show an empty state instead of adding users to a default garage
    return garages;
  } catch (error) {
    console.error("Error in getAccessibleGarages:", error);
    return [];
  }
}
