
import { supabase } from "@/integrations/supabase/client";

// Check if a user has a specific role
export const hasRole = async (userId: string, role: 'administrator' | 'technician' | 'front_desk'): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('has_role', { 
        user_id: userId, 
        role: role 
      });
      
    if (error) {
      console.error("Error checking role:", error.message);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error("Exception checking role:", err);
    return false;
  }
};

// Check if user is a garage owner
export const isGarageOwner = async (userId: string): Promise<boolean> => {
  try {
    // First check if user owns any garages directly
    const { data: ownedGarages, error: ownedError } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);
      
    if (!ownedError && ownedGarages && ownedGarages.length > 0) {
      return true;
    }
    
    // As a fallback, check the membership table
    const { data, error } = await supabase
      .from('garage_members')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .limit(1);
      
    if (error || !data || data.length === 0) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Error checking if user is garage owner:", err);
    return false;
  }
};

// Check if user is an administrator
export const isAdministrator = async (userId: string): Promise<boolean> => {
  return await hasRole(userId, 'administrator');
};
