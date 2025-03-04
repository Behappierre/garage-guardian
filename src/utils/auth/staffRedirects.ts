
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureUserHasGarage } from "./garageAssignment";

/**
 * Handles admin user on staff login page
 */
export async function handleAdminOnStaffLogin(userId: string) {
  // Administrator on staff login page - check if they have a garage
  const { data: profileData } = await supabase
    .from('profiles')
    .select('garage_id')
    .eq('id', userId)
    .single();
    
  if (profileData?.garage_id) {
    return { shouldRedirect: true, path: "/dashboard" };
  } 
  
  // Try to find owned garages
  const { data: ownedGarages } = await supabase
    .from('garages')
    .select('id')
    .eq('owner_id', userId)
    .limit(1);
    
  if (ownedGarages && ownedGarages.length > 0) {
    // Update profile with owned garage using direct update
    await supabase
      .from('profiles')
      .update({ garage_id: ownedGarages[0].id })
      .eq('id', userId);
      
    return { shouldRedirect: true, path: "/dashboard" };
  } 
  
  // Sign out and show error
  toast.error("Administrators should use the garage owner login");
  await supabase.auth.signOut();
  return { shouldRedirect: false, path: null };
}

/**
 * Handles staff users (non-admin) login redirects
 */
export async function handleStaffLogin(userId: string, userRole: string) {
  // Staff member - ensure they have a garage
  await ensureUserHasGarage(userId, userRole);
  
  // Redirect based on role
  switch (userRole) {
    case 'technician':
      return { shouldRedirect: true, path: "/dashboard/job-tickets" };
    case 'front_desk':
      return { shouldRedirect: true, path: "/dashboard/appointments" };
    default:
      return { shouldRedirect: true, path: "/dashboard" };
  }
}
