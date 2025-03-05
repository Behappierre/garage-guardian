
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Handles admin user on staff login page
 * Uses the user_roles.garage_id direct association
 */
export async function handleAdminOnStaffLogin(userId: string) {
  console.log("Handling admin on staff login page for user:", userId);
  
  // Check if user is actually an admin with the direct garage reference
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
  
  // If admin has a garage_id in user_roles, use it directly
  if (roleData.garage_id) {
    console.log("Admin has garage_id in user_roles:", roleData.garage_id);
    
    // Verify this garage exists
    const { data: garageCheck } = await supabase
      .from('garages')
      .select('id')
      .eq('id', roleData.garage_id)
      .maybeSingle();
      
    if (garageCheck) {
      console.log("Verified garage exists:", garageCheck.id);
      
      // Update only user_roles with garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: roleData.garage_id })
        .eq('user_id', userId);
        
      return { shouldRedirect: true, path: "/dashboard" };
    }
  }
  
  // Try to find owned garages
  const { data: ownedGarages } = await supabase
    .from('garages')
    .select('id')
    .eq('owner_id', userId);
  
  console.log("Owned garages:", JSON.stringify(ownedGarages));
    
  if (ownedGarages && ownedGarages.length > 0) {
    console.log("Admin owns garages:", ownedGarages.length);
    
    // Update user_roles with garage_id
    await supabase
      .from('user_roles')
      .update({ garage_id: ownedGarages[0].id })
      .eq('user_id', userId);
      
    return { shouldRedirect: true, path: "/dashboard" };
  } 
  
  // No garage found, redirect to garage creation
  console.log("Admin has no garages, redirecting to garage management");
  return { shouldRedirect: true, path: "/garage-management" };
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
