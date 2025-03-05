
import { supabase } from "@/integrations/supabase/client";
import { updateUserProfileWithGarage } from "./updateProfile";

/**
 * Attempts to get the user's garage from their garage_members entries
 */
export const getGarageFromMembership = async (userId: string): Promise<string | null> => {
  const { data: memberData, error: memberError } = await supabase
    .from('garage_members')
    .select('garage_id, garages(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (memberError) {
    console.error("Error fetching garage_members:", memberError);
    return null;
  }
  
  if (!memberData?.garage_id) {
    return null;
  }
  
  console.log("Found garage_id in garage_members:", memberData.garage_id);
  console.log("Garage name:", memberData.garages?.name);
  
  // Update profile and user_roles with this garage_id for consistency
  await updateUserProfileWithGarage(userId, memberData.garage_id);
  await updateUserRolesWithGarage(userId, memberData.garage_id);
  
  console.log("Updated profile and user_roles with garage_id from garage_members");
  return memberData.garage_id;
};

/**
 * Updates the user_roles table with the provided garage ID
 */
async function updateUserRolesWithGarage(userId: string, garageId: string): Promise<void> {
  await supabase
    .from('user_roles')
    .update({ garage_id: garageId })
    .eq('user_id', userId);
}
