
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Checks if user has the administrator role
 */
export async function isAdministrator(userId: string): Promise<boolean> {
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError) {
    console.error("Error fetching role:", roleError.message);
    return false;
  }

  return roleData?.role === 'administrator';
}

/**
 * Handles admin-specific flows when they own garages
 */
export async function handleAdminWithGarages(userId: string) {
  // Check if admin owns any garages
  const { data: ownedGarages, error: ownedError } = await supabase
    .from('garages')
    .select('id')
    .eq('owner_id', userId)
    .limit(1);
    
  if (ownedError) {
    console.error("Error checking owned garages:", ownedError);
  }
    
  if (ownedGarages && ownedGarages.length > 0) {
    // Update the admin's profile with their first garage
    await supabase
      .from('profiles')
      .update({ garage_id: ownedGarages[0].id })
      .eq('id', userId);
      
    return true;
  }
  
  return false;
}

/**
 * Handles admin profiles that don't own garages yet
 */
export async function handleAdminWithoutGarages(userId: string) {
  // Check if they have a garage assigned
  const { data: profileData } = await supabase
    .from('profiles')
    .select('garage_id')
    .eq('id', userId)
    .single();
    
  if (!profileData?.garage_id) {
    // Try to find any garage
    const { data: anyGarage } = await supabase
      .from('garages')
      .select('id')
      .limit(1);
      
    if (anyGarage && anyGarage.length > 0) {
      // Assign the first garage
      await supabase
        .from('profiles')
        .update({ garage_id: anyGarage[0].id })
        .eq('id', userId);
    }
  }
}

/**
 * Handles redirects and errors for non-administrators on owner login page
 */
export async function handleNonAdminAtOwnerLogin(userId: string) {
  toast.error("Only administrators can access the garage owner area");
  await supabase.auth.signOut();
  return false;
}
