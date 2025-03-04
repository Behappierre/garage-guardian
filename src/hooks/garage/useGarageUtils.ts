
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
    const { data, error } = await supabase
      .from('garages')
      .select('*')
      .or('name.ilike.%tractic%,slug.ilike.%tractic%');
      
    if (error) {
      console.error("Error finding Tractic garage:", error.message);
      return null;
    }
    
    console.log("Tractic garage search result:", data);
    
    if (data && data.length > 0) {
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
    const { error } = await supabase
      .from('garage_members')
      .upsert({
        user_id: userId,
        garage_id: garageId,
        role: role
      });
      
    if (error) {
      console.error("Error adding user to garage:", error.message);
      return false;
    }
    
    console.log(`Added user ${userId} to garage ${garageId} with role ${role}`);
    return true;
  } catch (err) {
    console.error("Exception when adding user as garage member:", err);
    return false;
  }
};

// Get user's garage memberships
export const getUserGarageMemberships = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('garage_members')
      .select('garage_id')
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error fetching garage memberships:", error.message);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map((item: Record<string, any>) => item.garage_id as string);
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
    const { data, error } = await supabase
      .from('garages')
      .select('*')
      .in('id', garageIds);
      
    if (error) {
      console.error("Error fetching garages by IDs:", error.message);
      return [];
    }
    
    return (data || []) as unknown as Garage[];
  } catch (err) {
    console.error("Exception when getting garages by IDs:", err);
    return [];
  }
};

// Get user's role
export const getUserRole = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error("Error fetching user role:", error.message);
      return null;
    }
    
    return data?.role;
  } catch (err) {
    console.error("Exception when getting user role:", err);
    return null;
  }
};
