
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
