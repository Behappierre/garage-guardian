
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
      
    // Update profile with garage_id
    await supabase
      .from('profiles')
      .update({ garage_id: ownedGarages[0].id })
      .eq('id', userId);
      
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
  // First check if user has a garage in their profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('garage_id')
    .eq('id', userId)
    .single();
    
  if (profileData?.garage_id) {
    // User already has a garage in profile
    console.log("User has garage_id in profile:", profileData.garage_id);
    
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
  
  // Check garage memberships if profile doesn't have garage_id
  const { data: memberData } = await supabase
    .from('garage_members')
    .select('garage_id')
    .eq('user_id', userId)
    .limit(1);
    
  if (memberData && memberData.length > 0) {
    // Found a garage membership, update profile
    await supabase
      .from('profiles')
      .update({ garage_id: memberData[0].garage_id })
      .eq('id', userId);
      
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
  
  // No garage found at all
  toast.info("You don't have a garage associated with your account. Please contact an administrator.");
  await supabase.auth.signOut();
  return { shouldRedirect: false, path: null };
}
