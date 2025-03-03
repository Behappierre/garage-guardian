
import { supabase } from "@/integrations/supabase/client";
import { CreateGarageFormData, Garage, GarageMember } from "@/types/garage";

export const createGarage = async (formData: CreateGarageFormData): Promise<{ garage: Garage | null; error: any }> => {
  try {
    // 1. First create user if it doesn't exist
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
    
    if (authError) throw authError;

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
      .select()
      .single();
    
    if (garageError) throw garageError;

    // 3. Create the garage member (owner)
    const { error: memberError } = await supabase
      .from("garage_members")
      .insert({
        garage_id: garageData.id,
        user_id: authData.user?.id,
        role: "owner",
      });
    
    if (memberError) throw memberError;

    return { 
      garage: garageData as Garage, 
      error: null 
    };
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
      .eq("slug", slug)
      .single();
    
    if (error) throw error;
    
    return { garage: data as Garage, error: null };
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
      .eq("garage_id", garageId);
    
    if (error) throw error;
    
    return { members: data as GarageMember[], error: null };
  } catch (error) {
    console.error("Error fetching garage members:", error);
    return { members: [], error };
  }
};
