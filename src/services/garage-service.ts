
import { supabase } from "@/integrations/supabase/client";
import { CreateGarageFormData, Garage, GarageMember } from "@/types/garage";

export const createGarage = async (formData: CreateGarageFormData): Promise<{ garage: Garage | null; error: any }> => {
  try {
    let userId: string | undefined;
    
    // 1. Check if user already exists using raw SQL query
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", formData.owner_email) as { data: any[] | null, error: any };
    
    if (profilesError) {
      throw profilesError;
    }
    
    // If user exists, take the first one
    if (profiles && profiles.length > 0) {
      userId = profiles[0].id;
    } else {
      // If user doesn't exist, create a new one
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.owner_email,
        password: formData.owner_password,
        options: {
          data: {
            first_name: formData.owner_first_name,
            last_name: formData.owner_last_name,
          }
        }
      });
      
      if (authError) {
        // If the error is "User already registered", try to get the user's ID
        if (authError.message === "User already registered") {
          // Try to sign in to get the user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.owner_email,
            password: formData.owner_password
          });
          
          if (signInError) throw signInError;
          userId = signInData.user?.id;
        } else {
          throw authError;
        }
      } else {
        userId = authData.user?.id;
      }
    }
    
    if (!userId) {
      throw new Error("Could not determine user ID");
    }

    // 2. Create the garage
    const { data: garageData, error: garageError } = await supabase
      .from("garages")
      .insert({
        name: formData.name,
        slug: formData.slug,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        logo_url: formData.logo_url,
      })
      .select() as { data: any[] | null, error: any };
    
    if (garageError) throw garageError;
    if (!garageData || garageData.length === 0) {
      throw new Error("Failed to create garage");
    }
    
    const newGarage = garageData[0];

    // 3. Create the garage member (owner)
    const { error: memberError } = await supabase
      .from("garage_members")
      .insert({
        garage_id: newGarage.id,
        user_id: userId,
        role: "owner",
      });
    
    if (memberError) throw memberError;

    // Explicitly create a Garage object with the correct type
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

export const getGarageBySlug = async (slug: string): Promise<{ garage: Garage | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("garages")
      .select("*")
      .eq("slug", slug) as { data: any[] | null, error: any };
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { garage: null, error: null };
    }
    
    const garageData = data[0];
    
    // Explicitly create a Garage object with the correct type
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
    const { data, error } = await supabase
      .from("garage_members")
      .select(`
        *,
        profile:profiles(id, first_name, last_name)
      `)
      .eq("garage_id", garageId) as { data: any[] | null, error: any };
    
    if (error) throw error;
    if (!data) {
      return { members: [], error: null };
    }
    
    // Explicitly map the data to the GarageMember type
    const members: GarageMember[] = data.map((member) => ({
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
