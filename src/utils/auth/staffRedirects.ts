import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Handles admin user on staff login page
 * Checks both user_roles and garage_members tables
 */
export async function handleAdminOnStaffLogin(userId: string) {
  console.log("Handling admin on staff login page for user:", userId);
  
  // First check if user is an admin
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role, garage_id')
    .eq('user_id', userId)
    .maybeSingle();
  
  console.log("Admin role check:", JSON.stringify(roleData));
  console.log("Role error:", roleError);
  
  if (roleError || !roleData || roleData.role !== 'administrator') {
    console.log("User is not an administrator, redirecting to staff login");
    return { shouldRedirect: false, path: null };
  }
  
  // Now check if admin is an owner in any garages via garage_members
  const { data: ownerMemberships, error: membershipError } = await supabase
    .from('garage_members')
    .select('garage_id')
    .eq('user_id', userId)
    .eq('role', 'owner');
    
  if (membershipError) {
    console.error("Error checking garage memberships:", membershipError);
  }
  
  // Also check directly owned garages
  const { data: ownedGarages } = await supabase
    .from('garages')
    .select('id')
    .eq('owner_id', userId);
  
  // Combine owned garages with garages where user is an owner member
  const totalGarages = [
    ...(ownedGarages || []).map(g => g.id),
    ...(ownerMemberships || []).map(g => g.garage_id)
  ];
  
  // Remove duplicates
  const uniqueGarageIds = [...new Set(totalGarages)];
  
  console.log("Admin has access to garages as owner:", uniqueGarageIds);
  
  // ALWAYS send admins to garage selection if they're coming from staff login
  // This ensures they can choose which garage to manage
  console.log("Admin on staff login, sending to garage selection");
  return { shouldRedirect: true, path: "/garage-management?source=staff" };
}

/**
 * Handles staff users (non-admin) login redirects
 * Utilizes the user_roles.garage_id direct association
 */
export async function handleStaffLogin(userId: string, userRole: string) {
  console.log("Handling staff login for user:", userId, "with role:", userRole);
  
  try {
    // First check if user has a garage_id in user_roles table
    const { data: userRoleData } = await supabase
      .from('user_roles')
      .select('role, garage_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log("Staff user_role check:", JSON.stringify(userRoleData));
    
    // If user_role has a valid garage_id, verify it exists
    if (userRoleData?.garage_id) {
      console.log("Staff already has garage_id in user_role:", userRoleData.garage_id);
      
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', userRoleData.garage_id)
        .maybeSingle();
      
      if (garageExists) {
        console.log("Verified garage exists:", garageExists.id);
        
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
    
    // Try to use a default garage as a fallback
    const { data: defaultGarage } = await supabase
      .from('garages')
      .select('id, name')
      .eq('slug', 'tractic')
      .maybeSingle();
      
    if (defaultGarage) {
      console.log("Found default Tractic garage:", defaultGarage.id);
      
      // Update user_roles with garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: defaultGarage.id })
        .eq('user_id', userId);
      
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
    
    // Last resort - find any garage
    const { data: anyGarage } = await supabase
      .from('garages')
      .select('id')
      .limit(1)
      .maybeSingle();
      
    if (anyGarage) {
      console.log("Found a garage to assign:", anyGarage.id);
      
      // Update user_roles with garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: anyGarage.id })
        .eq('user_id', userId);
      
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
    console.log("Staff has no garage assignment and no fallback garage found");
    toast.error("You don't have access to any garages. Please contact an administrator.");
    await supabase.auth.signOut();
    return { shouldRedirect: false, path: null };
  } catch (error) {
    console.error("Error in handleStaffLogin:", error);
    toast.error("An error occurred while processing your login. Please try again.");
    await supabase.auth.signOut();
    return { shouldRedirect: false, path: null };
  }
}
