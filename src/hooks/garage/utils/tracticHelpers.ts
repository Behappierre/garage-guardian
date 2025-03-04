
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Garage } from "../types";

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

// Add a user to a Tractic garage
export const addUserToGarage = async (userId: string, garageId: string): Promise<boolean> => {
  try {
    console.log(`Adding user ${userId} to Tractic garage ${garageId}`);
    
    // First, let's check if the user is already a member
    const { data: existingMembership, error: checkError } = await supabase
      .from('garage_members')
      .select('id')
      .eq('user_id', userId)
      .eq('garage_id', garageId)
      .limit(1);
      
    if (checkError) {
      console.error("Error checking existing membership:", checkError.message);
      return false;
    }
    
    // If user is already a member, return success
    if (existingMembership && existingMembership.length > 0) {
      console.log(`User ${userId} is already a member of garage ${garageId}`);
      return true;
    }
    
    // Add the user as a member with a role
    const { error: addError } = await supabase
      .from('garage_members')
      .insert({
        user_id: userId,
        garage_id: garageId,
        role: 'staff'  // Default role for Tractic users
      });
      
    if (addError) {
      console.error("Error adding user to garage:", addError.message);
      return false;
    }
    
    console.log(`Successfully added user ${userId} to Tractic garage ${garageId}`);
    return true;
  } catch (err) {
    console.error("Exception adding user to garage:", err);
    return false;
  }
};
