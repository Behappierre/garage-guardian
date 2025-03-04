
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
    
    console.log("User role:", data?.role);
    return data?.role || null;
  } catch (err) {
    console.error("Exception when getting user role:", err);
    return null;
  }
};
