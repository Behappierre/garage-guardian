
import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a garage membership for a user
 * @param userId The user ID to create the membership for
 * @param garageId The garage ID to associate with the user
 * @param role The role for the user in this garage (default: 'owner')
 * @returns boolean indicating success
 */
export const createGarageMember = async (
  userId: string, 
  garageId: string, 
  role = 'owner'
): Promise<boolean> => {
  console.log(`Creating garage membership: User ${userId}, Garage ${garageId}, Role ${role}`);
  
  const { data, error } = await supabase
    .from('garage_members')
    .upsert({
      user_id: userId,
      garage_id: garageId,
      role: role
    }, {
      onConflict: 'user_id,garage_id'
    });
    
  if (error) {
    console.error("Membership creation error:", error);
    return false;
  }
  
  console.log("Membership created successfully");
  return true;
};
