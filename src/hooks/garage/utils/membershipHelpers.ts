
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "../types";

// Add user as a member of a garage - using proper SELECT and INSERT queries
export const addUserToGarage = async (
  userId: string, 
  garageId: string, 
  role: string = 'owner'
): Promise<boolean> => {
  try {
    console.log(`Attempting to add user ${userId} to garage ${garageId} with role ${role}`);
    
    // First check if the membership already exists
    const { data, error } = await supabase
      .from('garage_members')
      .select('id')
      .eq('user_id', userId)
      .eq('garage_id', garageId)
      .limit(1);
      
    if (error) {
      console.error("Error checking existing membership:", error.message);
    } else if (data && data.length > 0) {
      console.log(`User ${userId} is already a member of garage ${garageId}`);
      return true;
    }
    
    // If no existing membership found, create one
    const memberData = {
      user_id: userId,
      garage_id: garageId,
      role: role
    };
    
    console.log("Creating garage membership with data:", memberData);
    
    const { error: insertError } = await supabase
      .from('garage_members')
      .insert(memberData);
      
    if (insertError) {
      console.error("Error adding user to garage:", insertError.message);
      return false;
    }
    
    console.log(`Added user ${userId} to garage ${garageId} with role ${role}`);
    
    // Update the user's profile with the garage ID for convenience
    // Explicitly specify the table name for garage_id in the SQL query
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
      
    if (profileError) {
      console.error("Non-critical error updating profile with garage_id:", profileError.message);
    }
    
    return true;
  } catch (err) {
    console.error("Exception when adding user as garage member:", err);
    return false;
  }
};

// Get user's garage memberships - using proper SQL SELECT
export const getUserGarageMemberships = async (userId: string): Promise<string[]> => {
  try {
    console.log(`Fetching garage memberships for user ${userId}`);
    
    const { data, error } = await supabase
      .from('garage_members')
      .select('garage_id')
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error fetching garage memberships:", error.message);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log("No garage memberships found for user");
      return [];
    }
    
    // Extract garage IDs from the data array
    const garageIds = data.map(item => item.garage_id);
    
    console.log("User garage IDs:", garageIds);
    return garageIds;
  } catch (err) {
    console.error("Exception when getting user garage memberships:", err);
    return [];
  }
};
