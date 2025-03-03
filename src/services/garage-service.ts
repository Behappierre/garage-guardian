
import { supabase } from "@/integrations/supabase/client";
import { CreateGarageFormData, Garage, GarageMember, GarageRole } from "@/types/garage";

// Define simplified response types to avoid deep nesting
interface GarageResponse {
  garage: Garage | null;
  error: any;
}

interface GarageMembersResponse {
  members: GarageMember[];
  error: any;
}

// Define simplified auth response types to avoid type recursion
interface AuthResponse {
  data: { 
    user: { id: string } | null | undefined 
  };
  error: any | null;
}

// Helper function to handle authentication responses without triggering deep type instantiation
async function handleSignUp(email: string, password: string, firstName: string, lastName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    
    if (error) throw error;
    return data?.user?.id || null;
  } catch (error) {
    throw error;
  }
}

async function handleSignIn(email: string, password: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data?.user?.id || null;
  } catch (error) {
    throw error;
  }
}

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
        ) as string;
      } catch (error: any) {
        // If the error is "User already registered", try to get the user's ID
        if (error.message === "User already registered") {
          // Try to sign in to get the user ID
          userId = await handleSignIn(formData.owner_email, formData.owner_password) as string;
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
        role: "owner" as GarageRole,
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

export const getGarageMembers = async (garageId: string): Promise<GarageMembersResponse> => {
  try {
    // Step 1: Fetch garage members
    const { data: membersData, error: membersError } = await supabase
      .from("garage_members")
      .select("*")
      .eq("garage_id", garageId);
    
    if (membersError) throw membersError;
    
    if (!membersData || membersData.length === 0) {
      return { members: [], error: null };
    }
    
    // Step 2: Extract user IDs using traditional loop
    const userIds: string[] = [];
    for (let i = 0; i < membersData.length; i++) {
      userIds.push(membersData[i].user_id);
    }
    
    // Step 3: Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);
    
    if (profilesError) throw profilesError;
    
    // Step 4: Create a profile lookup object
    type ProfileLookup = {
      [key: string]: {
        id: string;
        first_name: string | null;
        last_name: string | null;
      }
    };
    
    const profileMap: ProfileLookup = {};
    
    if (profilesData) {
      for (let i = 0; i < profilesData.length; i++) {
        const profile = profilesData[i];
        profileMap[profile.id] = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name
        };
      }
    }
    
    // Step 5: Build members array with explicit typing
    const members: GarageMember[] = [];
    
    for (let i = 0; i < membersData.length; i++) {
      const member = membersData[i];
      const profile = profileMap[member.user_id];
      
      members.push({
        id: member.id,
        garage_id: member.garage_id,
        user_id: member.user_id,
        role: member.role as GarageRole,
        created_at: member.created_at,
        profile: profile ? {
          id: profile.id,
          first_name: profile.first_name || null,
          last_name: profile.last_name || null
        } : null
      });
    }
    
    return { members, error: null };
  } catch (error) {
    console.error("Error fetching garage members:", error);
    return { members: [], error };
  }
};
