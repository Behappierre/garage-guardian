
import { supabase } from "@/integrations/supabase/client";

// Get user's role - using a proper SELECT query
export const getUserRole = async (userId: string): Promise<string | null> => {
  try {
    console.log(`Fetching role for user ${userId}`);
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching user role:", error.message);
      return null;
    }
    
    console.log("User role data:", data);
    return data?.role || null;
  } catch (err) {
    console.error("Exception when getting user role:", err);
    return null;
  }
};

// Check if user has administrator role
export const isAdministrator = async (userId: string): Promise<boolean> => {
  try {
    const role = await getUserRole(userId);
    console.log(`User ${userId} has role: ${role}`);
    return role === 'administrator';
  } catch (err) {
    console.error("Error checking administrator role:", err);
    return false;
  }
};

// Check if user has garage owner permission
export const hasGarageOwnerPermission = async (userId: string): Promise<boolean> => {
  try {
    // First, ensure the user is an administrator
    const isAdmin = await isAdministrator(userId);
    if (!isAdmin) {
      console.log(`User ${userId} is not an administrator`);
      return false;
    }
    
    console.log(`User ${userId} is administrator: ${isAdmin}`);
    
    // All administrators have garage owner permission
    return true;
  } catch (err) {
    console.error("Error checking garage owner permission:", err);
    return false;
  }
};

// Check if the user has any garage memberships
export const hasAnyGarageMembership = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('garage_members')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
      
    if (error) {
      console.error("Error checking garage memberships:", error.message);
      return false;
    }
    
    return data && data.length > 0;
  } catch (err) {
    console.error("Error checking garage memberships:", err);
    return false;
  }
};
