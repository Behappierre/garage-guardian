
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureUserHasGarage } from "./garageAssignment";

/**
 * Handles admin user on staff login page
 */
export async function handleAdminOnStaffLogin(userId: string) {
  // Administrator on staff login page - check if they have a garage membership
  const { data: memberData } = await supabase
    .from('garage_members')
    .select('garage_id')
    .eq('user_id', userId)
    .limit(1);
    
  if (memberData && memberData.length > 0) {
    return { shouldRedirect: true, path: "/dashboard" };
  } 
  
  // Try to find owned garages
  const { data: ownedGarages } = await supabase
    .from('garages')
    .select('id')
    .eq('owner_id', userId)
    .limit(1);
    
  if (ownedGarages && ownedGarages.length > 0) {
    // Add user as owner member if not already a member
    await supabase
      .from('garage_members')
      .upsert([{
        user_id: userId,
        garage_id: ownedGarages[0].id,
        role: 'owner'
      }]);
      
    return { shouldRedirect: true, path: "/dashboard" };
  } 
  
  // No garage found, redirect to garage creation
  toast.info("You don't have a garage yet. Please create one.");
  return { shouldRedirect: true, path: "/garage-management" };
}

/**
 * Handles staff users (non-admin) login redirects
 */
export async function handleStaffLogin(userId: string, userRole: string) {
  // Staff member - ensure they have a garage
  const hasGarage = await ensureUserHasGarage(userId, userRole);
  
  if (!hasGarage) {
    toast.info("You don't have a garage associated with your account. Please contact an administrator.");
    await supabase.auth.signOut();
    return { shouldRedirect: false, path: null };
  }
  
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
