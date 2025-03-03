
import { supabase } from "@/integrations/supabase/client";
import { CreateGarageFormData, Garage, GarageMember } from "@/types/garage";

export const createGarage = async (formData: CreateGarageFormData): Promise<{ garage: Garage | null; error: any }> => {
  try {
    let userId: string | undefined;
    
    // 1. Check if user already exists using raw query to avoid type recursion
    const profilesQuery = await supabase
      .from("profiles")
      .select("id")
      .eq("email", formData.owner_email);
    
    if (profilesQuery.error) {
      throw profilesQuery.error;
    }
    
    // If user exists, take the first one
    if (profilesQuery.data && profilesQuery.data.length > 0) {
      userId = profilesQuery.data[0].id;
    } else {
      // If user doesn't exist, create a new one
      const authResponse = await supabase.auth.signUp({
        email: formData.owner_email,
        password: formData.owner_password,
        options: {
          data: {
            first_name: formData.owner_first_name,
            last_name: formData.owner_last_name,
          }
        }
      });
      
      if (authResponse.error) {
        // If the error is "User already registered", try to get the user's ID
        if (authResponse.error.message === "User already registered") {
          // Try to sign in to get the user ID
          const signInResponse = await supabase.auth.signInWithPassword({
            email: formData.owner_email,
            password: formData.owner_password
          });
          
          if (signInResponse.error) throw signInResponse.error;
          userId = signInResponse.data.user?.id;
        } else {
          throw authResponse.error;
        }
      } else {
        userId = authResponse.data.user?.id;
      }
    }
    
    if (!userId) {
      throw new Error("Could not determine user ID");
    }

    // 2. Create the garage
    const garageInsert = await supabase
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
    
    if (garageInsert.error) throw garageInsert.error;
    
    const garageData = garageInsert.data[0];

    // 3. Create the garage member (owner)
    const memberInsert = await supabase
      .from("garage_members")
      .insert({
        garage_id: garageData.id,
        user_id: userId,
        role: "owner",
      });
    
    if (memberInsert.error) throw memberInsert.error;

    // Explicitly cast to Garage type to avoid deep type instantiation
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
    console.error("Error creating garage:", error);
    return { garage: null, error };
  }
};

export const getGarageBySlug = async (slug: string): Promise<{ garage: Garage | null; error: any }> => {
  try {
    const response = await supabase
      .from("garages")
      .select("*")
      .eq("slug", slug);
    
    if (response.error) throw response.error;
    
    if (!response.data || response.data.length === 0) {
      return { garage: null, error: null };
    }
    
    const garageData = response.data[0];
    
    // Explicitly cast to Garage type to avoid deep type instantiation
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

export const getGarageMembers = async (garageId: string): Promise<{ members: GarageMember[]; error: any }> => {
  try {
    const response = await supabase
      .from("garage_members")
      .select(`
        *,
        profile:profiles(id, first_name, last_name)
      `)
      .eq("garage_id", garageId);
    
    if (response.error) throw response.error;
    
    // Explicitly map to avoid deep type instantiation
    const members: GarageMember[] = response.data.map((member: any) => ({
      id: member.id,
      garage_id: member.garage_id,
      user_id: member.user_id,
      role: member.role,
      created_at: member.created_at,
      profile: member.profile
    }));
    
    return { members, error: null };
  } catch (error) {
    console.error("Error fetching garage members:", error);
    return { members: [], error };
  }
};
