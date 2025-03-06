
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Handles admin user on staff login page
 * Checks both user_roles and garage_members tables
 */
export async function handleAdminOnStaffLogin(userId: string) {
  console.log("Handling admin on staff login page for user:", userId);
  
  try {
    // First check if user is an admin in user_roles
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, garage_id')
      .eq('user_id', userId)
      .eq('role', 'administrator')
      .maybeSingle();
    
    console.log("Admin role check:", JSON.stringify(roleData));
    
    if (roleError) {
      console.error("Role check error:", roleError);
      return { shouldRedirect: false, path: null };
    }
    
    if (!roleData || roleData.role !== 'administrator') {
      // If not admin in user_roles, check if owner in garage_members
      const { data: ownerData, error: ownerError } = await supabase
        .from('garage_members')
        .select('role, garage_id')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .maybeSingle();
        
      console.log("Owner check:", JSON.stringify(ownerData));
      
      if (ownerError || !ownerData) {
        console.log("User is not an administrator or owner, redirecting to staff login");
        return { shouldRedirect: false, path: null };
      }
      
      // If user is an owner but not admin, treat as admin
      console.log("User is an owner, redirecting to garage management");
      
      // Update the user_roles to include administrator
      const { error: updateRoleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'administrator'
        });
        
      if (updateRoleError) {
        console.error("Error adding administrator role:", updateRoleError);
      } else {
        console.log("Added administrator role to owner");
      }
    }
    
    // Always send administrators to garage selection
    // when they come through the staff login flow
    console.log("Admin on staff login, sending to garage selection");
    return { shouldRedirect: true, path: "/garage-management?source=staff" };
  } catch (error) {
    console.error("Error in handleAdminOnStaffLogin:", error);
    return { shouldRedirect: false, path: null };
  }
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
        
        // Update profile with garage_id if needed
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ garage_id: userRoleData.garage_id })
          .eq('id', userId);
          
        if (profileError) {
          console.error("Error updating profile with garage_id:", profileError);
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
    }
    
    // Check profile for garage_id if not in user_roles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileData?.garage_id) {
      console.log("Found garage_id in profile:", profileData.garage_id);
      
      // Update user_roles with garage_id from profile
      const { error: updateRoleError } = await supabase
        .from('user_roles')
        .update({ garage_id: profileData.garage_id })
        .eq('user_id', userId);
        
      if (updateRoleError) {
        console.error("Error updating user_roles with garage_id:", updateRoleError);
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
      
      // Update profile with garage_id
      await supabase
        .from('profiles')
        .update({ garage_id: defaultGarage.id })
        .eq('id', userId);
        
      // Update garage_members if not already a member
      const { data: memberExists } = await supabase
        .from('garage_members')
        .select('id')
        .eq('user_id', userId)
        .eq('garage_id', defaultGarage.id)
        .maybeSingle();
        
      if (!memberExists) {
        await supabase
          .from('garage_members')
          .insert({
            user_id: userId,
            garage_id: defaultGarage.id,
            role: userRole
          });
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
      
      // Update profile with garage_id
      await supabase
        .from('profiles')
        .update({ garage_id: anyGarage.id })
        .eq('id', userId);
        
      // Update garage_members if not already a member
      const { data: memberExists } = await supabase
        .from('garage_members')
        .select('id')
        .eq('user_id', userId)
        .eq('garage_id', anyGarage.id)
        .maybeSingle();
        
      if (!memberExists) {
        await supabase
          .from('garage_members')
          .insert({
            user_id: userId,
            garage_id: anyGarage.id,
            role: userRole
          });
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
