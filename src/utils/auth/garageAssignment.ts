
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a user has a garage assigned to their profile
 */
export async function ensureUserHasGarage(userId: string, userRole: string) {
  // First check profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('garage_id')
    .eq('id', userId)
    .single();
    
  if (!profileData?.garage_id) {
    // If no garage_id in profile, check memberships
    const { data: memberData } = await supabase
      .from('garage_members')
      .select('garage_id')
      .eq('user_id', userId)
      .limit(1);
      
    if (memberData && memberData.length > 0) {
      // Update profile with found garage_id using direct update
      await supabase
        .from('profiles')
        .update({ garage_id: memberData[0].garage_id })
        .eq('id', userId);
    } else {
      await assignUserToDefaultGarage(userId, userRole);
    }
  }
}

/**
 * Attempts to assign a user to the default 'tractic' garage or any available garage
 */
export async function assignUserToDefaultGarage(userId: string, userRole: string) {
  // Try to use default Tractic garage
  const { data: defaultGarage } = await supabase
    .from('garages')
    .select('id')
    .eq('slug', 'tractic')
    .limit(1);
    
  if (defaultGarage && defaultGarage.length > 0) {
    const defaultGarageId = defaultGarage[0].id;
    
    // Add user as member
    await supabase
      .from('garage_members')
      .upsert([
        { user_id: userId, garage_id: defaultGarageId, role: userRole }
      ]);
      
    // Update profile using direct update
    await supabase
      .from('profiles')
      .update({ garage_id: defaultGarageId })
      .eq('id', userId);
  } else {
    // If no default garage, find any available garage
    const { data: anyGarage } = await supabase
      .from('garages')
      .select('id')
      .limit(1);
      
    if (anyGarage && anyGarage.length > 0) {
      const garageId = anyGarage[0].id;
      
      // Add user as member
      await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: garageId, role: userRole }
        ]);
        
      // Update profile using direct update
      await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userId);
    }
  }
}
