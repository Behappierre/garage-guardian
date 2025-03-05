
import { supabase } from "@/integrations/supabase/client";
import { updateUserProfileWithGarage } from "./updateProfile";
import { verifyGarageExists } from "./helpers";

/**
 * Attempts to get the user's garage from their user_roles entry
 */
export const getGarageFromUserRoles = async (userId: string, garageId: string): Promise<string | null> => {
  console.log("Found garage_id in user_roles:", garageId);
  
  // Verify this garage exists
  const garageExists = await verifyGarageExists(garageId);

  if (garageExists) {
    console.log("Verified garage from user_roles exists");
    
    // Update profile with this garage_id for consistency
    await updateUserProfileWithGarage(userId, garageId);
    console.log("Updated profile with garage_id from user_roles");
    
    return garageId;
  }
  
  console.log("Garage ID from user_roles doesn't exist, will try other sources");
  return null;
};
