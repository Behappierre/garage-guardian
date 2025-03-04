
import { supabase } from "@/integrations/supabase/client";

// Get user's role - using a proper SELECT query
export const getUserRole = async (userId: string): Promise<string | null> => {
  try {
    console.log(`Fetching role for user ${userId}`);
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
      
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
    return role === 'administrator';
  } catch (err) {
    console.error("Error checking administrator role:", err);
    return false;
  }
};

// Check if user has garage owner permission
export const hasGarageOwnerPermission = async (userId: string): Promise<boolean> => {
  // Always check if the user is an administrator first
  const isAdmin = await isAdministrator(userId);
  if (isAdmin) {
    return true;
  }
  
  // Additional permission checks could be added here
  return false;
};
