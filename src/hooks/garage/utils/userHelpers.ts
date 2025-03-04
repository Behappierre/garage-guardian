
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Check if a user has the administrator role
export const isAdministrator = async (userId: string): Promise<boolean> => {
  try {
    console.log(`Checking if user ${userId} has administrator role`);
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'administrator')
      .maybeSingle();
    
    if (error) {
      console.error("Error checking administrator role:", error.message);
      return false;
    }
    
    console.log("User role data:", data);
    return !!data;
  } catch (err) {
    console.error("Exception when checking if user is administrator:", err);
    return false;
  }
};

// Assign administrator role to a user
export const assignAdministratorRole = async (userId: string): Promise<boolean> => {
  try {
    // First check if the user already has the administrator role
    const isAdmin = await isAdministrator(userId);
    
    if (isAdmin) {
      console.log(`User ${userId} already has administrator role`);
      return true;
    }
    
    // If not, assign the administrator role
    const { error } = await supabase
      .from('user_roles')
      .insert([
        { 
          user_id: userId,
          role: 'administrator'
        }
      ]);
    
    if (error) {
      console.error("Error assigning administrator role:", error.message);
      return false;
    }
    
    console.log(`Assigned administrator role to user ${userId}`);
    return true;
  } catch (err) {
    console.error("Exception when assigning administrator role:", err);
    return false;
  }
};

// Get all roles for a user
export const getUserRoles = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error fetching user roles:", error.message);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map(item => item.role);
  } catch (err) {
    console.error("Exception when getting user roles:", err);
    return [];
  }
};
