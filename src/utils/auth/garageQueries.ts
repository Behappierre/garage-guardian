
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "@/types/garage";

/**
 * Creates a new garage with proper error handling
 */
export async function createGarage(name: string, slug: string, ownerId: string): Promise<Garage | null> {
  try {
    // Create a new garage record
    const { data: newGarage, error } = await supabase
      .from('garages')
      .insert([{
        name,
        slug,
        owner_id: ownerId
      }])
      .select('id, name, slug, address, email, phone, created_at, owner_id')
      .single();
      
    if (error) {
      console.error("Error creating garage:", error);
      return null;
    }
    
    return newGarage;
  } catch (error) {
    console.error("Exception creating garage:", error);
    return null;
  }
}

/**
 * Finds a garage by slug with proper column aliasing
 */
export async function findGarageBySlug(slug: string): Promise<Garage | null> {
  try {
    const { data, error } = await supabase
      .from('garages')
      .select('id, name, slug, address, email, phone, created_at, owner_id')
      .eq('slug', slug)
      .maybeSingle();
      
    if (error) {
      console.error("Error finding garage by slug:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Exception finding garage by slug:", error);
    return null;
  }
}

/**
 * Gets any garage from the system
 */
export async function getAnyGarage(): Promise<Garage | null> {
  try {
    const { data, error } = await supabase
      .from('garages')
      .select('id, name, slug, address, email, phone, created_at, owner_id')
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error("Error getting any garage:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Exception getting any garage:", error);
    return null;
  }
}

/**
 * Gets a garage by its ID
 */
export async function getGarageById(garageId: string): Promise<Garage | null> {
  try {
    const { data, error } = await supabase
      .from('garages')
      .select('id, name, slug, address, email, phone, created_at, owner_id')
      .eq('id', garageId)
      .maybeSingle();
      
    if (error) {
      console.error("Error getting garage by ID:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Exception getting garage by ID:", error);
    return null;
  }
}

/**
 * Updates the user's profile and user_role with the specified garage ID
 */
export async function updateUserGarageAssociations(userId: string, garageId: string, role: string): Promise<boolean> {
  try {
    // Update user_roles
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ garage_id: garageId })
      .eq('user_id', userId);
      
    if (roleError) {
      console.error("Error updating user_roles:", roleError);
      return false;
    }
    
    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
      
    if (profileError) {
      console.error("Error updating profile:", profileError);
      return false;
    }
    
    // Ensure user is a member of this garage
    const { error: memberError } = await supabase
      .from('garage_members')
      .upsert([{
        user_id: userId,
        garage_id: garageId,
        role
      }]);
      
    if (memberError) {
      console.error("Error updating garage_members:", memberError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception updating user garage associations:", error);
    return false;
  }
}
