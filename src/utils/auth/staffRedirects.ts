
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureUserHasGarage } from "./garageAssignment";

/**
 * Handles admin user on staff login page
 */
export async function handleAdminOnStaffLogin(userId: string) {
  console.log("Handling admin on staff login page for user:", userId);
  
  // Check garage memberships first
  const { data: memberData } = await supabase
    .from('garage_members')
    .select('garage_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (memberData && memberData.length > 0) {
    console.log("Admin has garage memberships:", memberData.length);
    
    // Update profile with garage_id to ensure it's properly set
    await supabase
      .from('profiles')
      .update({ garage_id: memberData[0].garage_id })
      .eq('id', userId);
      
    return { shouldRedirect: true, path: "/dashboard" };
  } 
  
  // Try to find owned garages
  const { data: ownedGarages } = await supabase
    .from('garages')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
    
  if (ownedGarages && ownedGarages.length > 0) {
    console.log("Admin owns garages:", ownedGarages.length);
    
    // Add user as owner member if not already a member
    await supabase
      .from('garage_members')
      .upsert([{
        user_id: userId,
        garage_id: ownedGarages[0].id,
        role: 'owner'
      }]);
      
    // Update profile with garage_id
    await supabase
      .from('profiles')
      .update({ garage_id: ownedGarages[0].id })
      .eq('id', userId);
      
    return { shouldRedirect: true, path: "/dashboard" };
  } 
  
  // No garage found, redirect to garage creation
  console.log("Admin has no garages, redirecting to garage management");
  toast.info("You don't have a garage yet. Please create one.");
  return { shouldRedirect: true, path: "/garage-management" };
}

/**
 * Handles staff users (non-admin) login redirects
 */
export async function handleStaffLogin(userId: string, userRole: string) {
  console.log("Handling staff login for user:", userId, "with role:", userRole);
  
  // Ensure the user has a garage assignment
  const hasGarage = await ensureUserHasGarage(userId, userRole);
  
  if (hasGarage) {
    // Get the garage_id from profile since it should be updated by ensureUserHasGarage
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .single();
      
    if (profileData?.garage_id) {
      console.log("Staff has garage_id in profile:", profileData.garage_id);
      
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
  }
  
  // No garage found at all
  console.log("Staff has no garage assignment");
  toast.info("You don't have a garage associated with your account. Please contact an administrator.");
  await supabase.auth.signOut();
  return { shouldRedirect: false, path: null };
}
