
import { supabase } from "@/integrations/supabase/client";
import { CreateGarageFormData, Garage } from "@/types/garage";
import { GarageResponse } from "./types";
import { handleSignUp, handleSignIn } from "../auth/auth-service";

/**
 * Creates a new garage and associates an owner with it
 */
export const createGarage = async (formData: CreateGarageFormData): Promise<GarageResponse> => {
  try {
    let userId: string | undefined;
    
    // 1. Check if user already exists
    const profilesResponse = await supabase
      .from("profiles")
      .select("id")
      .eq("email", formData.owner_email);
    
    if (profilesResponse.error) {
      throw profilesResponse.error;
    }
    
    // If user exists, take the first one
    if (profilesResponse.data && profilesResponse.data.length > 0) {
      userId = profilesResponse.data[0].id;
    } else {
      // If user doesn't exist, create a new one
      try {
        userId = await handleSignUp(
          formData.owner_email, 
          formData.owner_password,
          formData.owner_first_name,
          formData.owner_last_name
        );
        
        if (!userId) {
          throw new Error("Failed to create user account");
        }
      } catch (error: any) {
        // If the error is "User already registered", try to get the user's ID
        if (error.message === "User already registered") {
          // Try to sign in to get the user ID
          userId = await handleSignIn(formData.owner_email, formData.owner_password);
          if (!userId) {
            throw new Error("Could not retrieve user ID after sign in");
          }
        } else {
          throw error;
        }
      }
    }
    
    if (!userId) {
      throw new Error("Could not determine user ID");
    }

    // 2. Create the garage
    const garageResponse = await supabase
      .from("garages")
      .insert({
        name: formData.name,
        slug: formData.slug,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        logo_url: formData.logo_url,
      })
      .select();
    
    if (garageResponse.error) throw garageResponse.error;
    if (!garageResponse.data || garageResponse.data.length === 0) {
      throw new Error("Failed to create garage");
    }
    
    const newGarage = garageResponse.data[0];

    // 3. Create the garage member (owner)
    const memberResponse = await supabase
      .from("garage_members")
      .insert({
        garage_id: newGarage.id,
        user_id: userId,
        role: "owner",
      });
    
    if (memberResponse.error) throw memberResponse.error;

    // Return garage data with explicit typing
    const garage: Garage = {
      id: newGarage.id,
      name: newGarage.name,
      slug: newGarage.slug,
      address: newGarage.address,
      phone: newGarage.phone,
      email: newGarage.email,
      logo_url: newGarage.logo_url,
      settings: newGarage.settings,
      created_at: newGarage.created_at,
      updated_at: newGarage.updated_at
    };

    return { garage, error: null };
  } catch (error) {
    console.error("Error creating garage:", error);
    return { garage: null, error };
  }
};

/**
 * Retrieves a garage by its slug
 */
export const getGarageBySlug = async (slug: string): Promise<GarageResponse> => {
  try {
    // Use maybeSingle instead of single to handle not found case without error
    const response = await supabase
      .from("garages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    
    if (response.error) {
      throw response.error;
    }
    
    if (!response.data) {
      return { garage: null, error: null };
    }
    
    const garageData = response.data;
    
    // Return with explicit type to avoid inference issues
    const garage: Garage = {
      id: garageData.id,
      name: garageData.name,
      slug: garageData.slug,
      address: garageData.address,
      phone: garageData.phone,
      email: garageData.email,
      logo_url: garageData.logo_url,
      settings: garageData.settings,
      created_at: garageData.created_at,
      updated_at: garageData.updated_at
    };
    
    return { garage, error: null };
  } catch (error) {
    console.error("Error fetching garage by slug:", error);
    return { garage: null, error };
  }
};
