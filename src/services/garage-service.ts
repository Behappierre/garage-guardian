
import { supabase } from "@/integrations/supabase/client";
import { CreateGarageFormData, Garage, GarageMember, GarageRole } from "@/types/garage";

export const createGarage = async (formData: CreateGarageFormData): Promise<{ garage: Garage | null; error: any }> => {
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

// Fix type instantiation issue by completely rewriting the function with no type inference issues
export const getGarageMembers = async (garageId: string): Promise<{ members: GarageMember[]; error: any }> => {
  try {
    // 1. Fetch all members for this garage
    const { data: membersData, error: membersError } = await supabase
      .from("garage_members")
      .select("*")
      .eq("garage_id", garageId);
    
    if (membersError) throw membersError;
    
    // Return empty array if no data
    if (!membersData || membersData.length === 0) {
      return { members: [], error: null };
    }
    
    // 2. Get all user IDs to fetch profiles 
    const userIds: string[] = [];
    for (const member of membersData) {
      userIds.push(member.user_id);
    }
    
    // 3. Fetch profiles separately
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);
    
    if (profilesError) throw profilesError;
    
    // 4. Create a lookup map for profiles
    const profileMap: Record<string, { id: string; first_name: string | null; last_name: string | null }> = {};
    
    if (profilesData) {
      for (const profile of profilesData) {
        profileMap[profile.id] = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name
        };
      }
    }
    
    // 5. Build the final members array without type inference issues
    const members: GarageMember[] = [];
    
    for (const member of membersData) {
      const profile = profileMap[member.user_id];
      
      // Create a properly typed GarageMember object
      const garageMember: GarageMember = {
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
      };
      
      members.push(garageMember);
    }
    
    return { members, error: null };
  } catch (error) {
    console.error("Error fetching garage members:", error);
    return { members: [], error };
  }
};
