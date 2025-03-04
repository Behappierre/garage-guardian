
import { supabase } from "@/integrations/supabase/client";

// Add a user to a garage with a specific role
export const addUserToGarage = async (
  userId: string,
  garageId: string,
  role: 'owner' | 'staff' | 'technician' | 'front_desk'
): Promise<boolean> => {
  try {
    console.log(`Adding user ${userId} as ${role} to garage ${garageId}`);
    
    // If the role is 'owner', update the garage record directly
    if (role === 'owner') {
      const { error: ownerError } = await supabase
        .from('garages')
        .update({ owner_id: userId })
        .eq('id', garageId);
      
      if (ownerError) {
        console.error("Error setting garage owner:", ownerError.message);
        return false;
      }
    }
    
    // We still add a record to garage_members for compatibility with existing code
    const { error } = await supabase
      .from('garage_members')
      .insert({
        user_id: userId,
        garage_id: garageId,
        role: role
      });
    
    if (error) {
      console.error("Error adding user to garage:", error.message);
      return false;
    }
    
    console.log(`Successfully added user ${userId} as ${role} to garage ${garageId}`);
    return true;
  } catch (err: any) {
    console.error("Exception adding user to garage:", err.message);
    return false;
  }
};

// Get list of garages a user is a member of
export const getUserGarages = async (userId: string): Promise<string[]> => {
  try {
    console.log(`Getting garages for user ${userId}`);
    
    // First check garages owned by the user
    const { data: ownedGarages, error: ownedError } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId);
    
    if (ownedError) {
      console.error("Error getting owned garages:", ownedError.message);
      return [];
    }
    
    // Then check garage memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('garage_members')
      .select('garage_id')
      .eq('user_id', userId);
    
    if (membershipError) {
      console.error("Error getting garage memberships:", membershipError.message);
      return [];
    }
    
    // Combine both results (owned garages + memberships)
    const ownedIds = ownedGarages.map(g => g.id);
    const membershipIds = memberships.map(m => m.garage_id);
    
    // Use Set to remove duplicates
    const uniqueGarageIds = [...new Set([...ownedIds, ...membershipIds])];
    
    console.log(`Found ${uniqueGarageIds.length} garages for user ${userId}`);
    return uniqueGarageIds;
  } catch (err: any) {
    console.error("Exception getting user garages:", err.message);
    return [];
  }
};
