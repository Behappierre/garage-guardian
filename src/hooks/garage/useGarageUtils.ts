
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Garage } from "./types";

// Check if user is a Tractic user (email contains 'tractic' or is a specific email)
export const isTracticUser = (email?: string): boolean => {
  if (!email) return false;
  return email.toLowerCase().includes("tractic") || 
         email === "olivier@andre.org.uk";
};

// Search for existing Tractic garage
export const findTracticGarage = async (): Promise<Garage | null> => {
  try {
    console.log("Searching for existing Tractic garage");
    
    const { data, error } = await supabase.rpc(
      'execute_read_only_query',
      { 
        query_text: `
          SELECT *
          FROM garages
          WHERE name ILIKE '%tractic%' OR slug ILIKE '%tractic%'
        `
      }
    );
      
    if (error) {
      console.error("Error finding Tractic garage:", error.message);
      return null;
    }
    
    console.log("Tractic garage search result:", data);
    
    if (data && Array.isArray(data) && data.length > 0) {
      console.log("Found Tractic garage:", data[0]);
      return data[0] as unknown as Garage;
    }
    
    return null;
  } catch (err) {
    console.error("Exception when finding Tractic garage:", err);
    return null;
  }
};

// Create a new Tractic garage
export const createTracticGarage = async (userEmail?: string): Promise<Garage | null> => {
  try {
    console.log("Creating new Tractic garage for user:", userEmail);
    
    const { data: newGarage, error: createError } = await supabase
      .from('garages')
      .insert({
        name: 'Tractic Garage',
        slug: 'tractic-garage',
        address: '123 Tractic Street',
        email: userEmail
      })
      .select();
      
    if (createError) {
      console.error("Error creating Tractic garage:", createError.message);
      toast.error("Could not create Tractic garage");
      return null;
    }
    
    if (newGarage && newGarage.length > 0) {
      console.log("Created new Tractic garage:", newGarage[0]);
      return newGarage[0] as unknown as Garage;
    }
    
    return null;
  } catch (err) {
    console.error("Exception when creating Tractic garage:", err);
    return null;
  }
};

// Add user as a member of a garage
export const addUserToGarage = async (
  userId: string, 
  garageId: string, 
  role: string = 'owner'
): Promise<boolean> => {
  try {
    console.log(`Attempting to add user ${userId} to garage ${garageId} with role ${role}`);
    
    // First check if the membership already exists
    const { data, error } = await supabase.rpc(
      'execute_read_only_query',
      { 
        query_text: `
          SELECT * 
          FROM garage_members 
          WHERE user_id = '${userId}' AND garage_id = '${garageId}'
          LIMIT 1
        `
      }
    );
      
    if (error) {
      console.error("Error checking existing membership:", error.message);
    } else if (data && Array.isArray(data) && data.length > 0) {
      console.log(`User ${userId} is already a member of garage ${garageId}`);
      return true;
    }
    
    // If no existing membership found, create one
    const { error: insertError } = await supabase
      .from('garage_members')
      .insert({
        user_id: userId,
        garage_id: garageId,
        role: role
      });
      
    if (insertError) {
      console.error("Error adding user to garage:", insertError.message);
      return false;
    }
    
    console.log(`Added user ${userId} to garage ${garageId} with role ${role}`);
    return true;
  } catch (err) {
    console.error("Exception when adding user as garage member:", err);
    return false;
  }
};

// Get user's garage memberships - directly fetch garage IDs from garage_members
export const getUserGarageMemberships = async (userId: string): Promise<string[]> => {
  try {
    console.log(`Fetching garage memberships for user ${userId}`);
    
    // Use a direct SQL query to avoid RLS issues
    const { data, error } = await supabase.rpc(
      'execute_read_only_query',
      { 
        query_text: `
          SELECT garage_id 
          FROM garage_members 
          WHERE user_id = '${userId}'
        `
      }
    );
    
    if (error) {
      console.error("Error fetching garage memberships:", error.message);
      return [];
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log("No garage memberships found for user");
      return [];
    }
    
    const garageIds = data.map(item => item.garage_id);
    console.log("User garage IDs:", garageIds);
    return garageIds;
  } catch (err) {
    console.error("Exception when getting user garage memberships:", err);
    return [];
  }
};

// Get garages by IDs
export const getGaragesByIds = async (garageIds: string[]): Promise<Garage[]> => {
  if (garageIds.length === 0) {
    return [];
  }
  
  try {
    console.log(`Fetching garages by IDs: ${garageIds.join(', ')}`);
    
    // Use a direct SQL query to avoid potential RLS issues
    const idList = garageIds.map(id => `'${id}'`).join(',');
    const { data, error } = await supabase.rpc(
      'execute_read_only_query',
      { 
        query_text: `
          SELECT * 
          FROM garages 
          WHERE id IN (${idList})
        `
      }
    );
      
    if (error) {
      console.error("Error fetching garages by IDs:", error.message);
      return [];
    }
    
    console.log("Fetched garages:", data);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    return data as unknown as Garage[];
  } catch (err) {
    console.error("Exception when getting garages by IDs:", err);
    return [];
  }
};

// Get user's role
export const getUserRole = async (userId: string): Promise<string | null> => {
  try {
    // Use a direct SQL query to avoid potential RLS issues
    const { data, error } = await supabase.rpc(
      'execute_read_only_query',
      { 
        query_text: `
          SELECT role 
          FROM user_roles 
          WHERE user_id = '${userId}'
          LIMIT 1
        `
      }
    );
      
    if (error) {
      console.error("Error fetching user role:", error.message);
      return null;
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error("No role found for user");
      return null;
    }
    
    return data[0].role;
  } catch (err) {
    console.error("Exception when getting user role:", err);
    return null;
  }
};
