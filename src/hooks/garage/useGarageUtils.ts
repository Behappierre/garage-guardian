
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Garage } from "./types";

// Check if user is a Tractic user (email contains 'tractic' or is a specific email)
export const isTracticUser = (email?: string): boolean => {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  console.log("Checking if user is Tractic user:", lowerEmail);
  return lowerEmail.includes("tractic") || 
         lowerEmail === "olivier@andre.org.uk";
};

// Search for existing Tractic garage - using a valid SELECT query
export const findTracticGarage = async (): Promise<Garage | null> => {
  try {
    console.log("Searching for existing Tractic garage");
    
    // Use a simple select query with ilike for pattern matching
    const { data, error } = await supabase
      .from('garages')
      .select('*')
      .or('name.ilike.%tractic%,slug.ilike.%tractic%')
      .limit(1);
      
    if (error) {
      console.error("Error finding Tractic garage:", error.message);
      return null;
    }
    
    console.log("Tractic garage search result:", data);
    
    if (data && data.length > 0) {
      console.log("Found Tractic garage:", data[0]);
      return data[0] as Garage;
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
    
    const garageData = {
      name: 'Tractic Garage',
      slug: 'tractic-garage',
      address: '123 Tractic Street',
      email: userEmail || 'tractic@example.com'
    };
    
    const { data: newGarage, error: createError } = await supabase
      .from('garages')
      .insert(garageData)
      .select();
      
    if (createError) {
      console.error("Error creating Tractic garage:", createError.message);
      toast.error("Could not create Tractic garage");
      return null;
    }
    
    if (newGarage && newGarage.length > 0) {
      console.log("Created new Tractic garage:", newGarage[0]);
      return newGarage[0] as Garage;
    }
    
    return null;
  } catch (err) {
    console.error("Exception when creating Tractic garage:", err);
    return null;
  }
};

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
    
    const { error: insertError } = await supabase
      .from('garage_members')
      .insert(memberData);
      
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

// Get garages by IDs - using proper SQL SELECT
export const getGaragesByIds = async (garageIds: string[]): Promise<Garage[]> => {
  if (garageIds.length === 0) {
    console.log("No garage IDs provided");
    return [];
  }
  
  try {
    console.log(`Fetching garages by IDs: ${garageIds.join(', ')}`);
    
    // Use the Supabase .in() method to fetch garages by IDs
    const { data, error } = await supabase
      .from('garages')
      .select('*')
      .in('id', garageIds);
      
    if (error) {
      console.error("Error fetching garages by IDs:", error.message);
      return [];
    }
    
    console.log("Fetched garages:", data);
    
    if (!data || data.length === 0) {
      console.log("No garages found for the provided IDs");
      return [];
    }
    
    return data as Garage[];
  } catch (err) {
    console.error("Exception when getting garages by IDs:", err);
    return [];
  }
};

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
