
import { supabase } from "@/integrations/supabase/client";
import { verifyGarageExists } from "./helpers";

/**
 * Attempts to get the user's garage from their profile
 */
export const getGarageFromProfile = async (userId: string): Promise<string | null> => {
  // Get profile data with detailed logging
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('garage_id')
    .eq('id', userId)
    .single();
    
  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return null;
  } 
  
  if (!profileData?.garage_id) {
    return null;
  }
  
  console.log("Found garage_id in profile:", profileData.garage_id);
  
  // Verify this garage exists
  const garageExists = await verifyGarageExists(profileData.garage_id);
  
  if (garageExists) {
    console.log("Verified garage exists from profile");
    return profileData.garage_id;
  } 
  
  console.log("Garage ID from profile doesn't exist, will try other sources");
  return null;
};
