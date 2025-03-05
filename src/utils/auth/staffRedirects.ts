
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureUserHasGarage } from "./garageAssignment";

/**
 * Handles admin user on staff login page
 */
export async function handleAdminOnStaffLogin(userId: string) {
  console.log("Handling admin on staff login page for user:", userId);
  
  // Check if user is actually an admin
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  
  console.log("Admin role check:", JSON.stringify(roleData));
  console.log("Role error:", roleError);
  
  if (roleError || !roleData || roleData.role !== 'administrator') {
    console.log("User is not an administrator, redirecting to staff login");
    return { shouldRedirect: false, path: null };
  }
  
  // Check garage memberships first
  const { data: memberData, error: memberError } = await supabase
    .from('garage_members')
    .select('garage_id, role')
    .eq('user_id', userId);
  
  console.log("Admin garage memberships:", JSON.stringify(memberData));
  console.log("Membership error:", memberError);
    
  if (memberData && memberData.length > 0) {
    console.log("Admin has garage memberships:", memberData.length);
    
    // Verify this garage exists
    const { data: garageCheck, error: garageCheckError } = await supabase
      .from('garages')
      .select('id')
      .eq('id', memberData[0].garage_id)
      .maybeSingle();
      
    console.log("Garage check result:", JSON.stringify(garageCheck));
    console.log("Garage check error:", garageCheckError);
      
    if (garageCheckError && !garageCheckError.message.includes('No rows found')) {
      console.error("Error checking if admin's member garage exists:", garageCheckError);
    }
    
    if (garageCheck) {
      // Update profile with garage_id to ensure it's properly set
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ garage_id: memberData[0].garage_id })
        .eq('id', userId);
      
      console.log("Profile update error:", updateError);
        
      return { shouldRedirect: true, path: "/dashboard" };
    }
  } 
  
  // Try to find owned garages
  const { data: ownedGarages, error: ownedError } = await supabase
    .from('garages')
    .select('id')
    .eq('owner_id', userId);
  
  console.log("Owned garages:", JSON.stringify(ownedGarages));
  console.log("Owned garages error:", ownedError);
    
  if (ownedGarages && ownedGarages.length > 0) {
    console.log("Admin owns garages:", ownedGarages.length);
    
    // Add user as owner member if not already a member
    const { error: upsertError } = await supabase
      .from('garage_members')
      .upsert([{
        user_id: userId,
        garage_id: ownedGarages[0].id,
        role: 'owner'
      }]);
    
    console.log("Garage member upsert error:", upsertError);
      
    // Update profile with garage_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ garage_id: ownedGarages[0].id })
      .eq('id', userId);
    
    console.log("Profile update error:", updateError);
      
    return { shouldRedirect: true, path: "/dashboard" };
  } 
  
  // No garage found, redirect to garage creation
  console.log("Admin has no garages, redirecting to garage management");
  return { shouldRedirect: true, path: "/garage-management" };
}

/**
 * Handles staff users (non-admin) login redirects
 */
export async function handleStaffLogin(userId: string, userRole: string) {
  console.log("Handling staff login for user:", userId, "with role:", userRole);
  
  try {
    // First check if user already has a garage in profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
    
    console.log("Staff profile check:", JSON.stringify(profileData));
    console.log("Profile error:", profileError);
    
    // If profile already has a valid garage_id, verify it exists
    if (profileData?.garage_id) {
      console.log("Staff already has garage_id in profile:", profileData.garage_id);
      
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', profileData.garage_id)
        .maybeSingle();
      
      if (garageExists) {
        console.log("Verified garage exists:", garageExists.id);
        
        // Make sure user is also in garage_members
        const { data: memberCheck } = await supabase
          .from('garage_members')
          .select('id')
          .eq('user_id', userId)
          .eq('garage_id', profileData.garage_id)
          .maybeSingle();
          
        if (!memberCheck) {
          // Add user to garage_members for consistency
          await supabase
            .from('garage_members')
            .upsert([
              { user_id: userId, garage_id: profileData.garage_id, role: userRole }
            ]);
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
    
    // Check directly if user is a member of any garage
    const { data: membershipData, error: membershipError } = await supabase
      .from('garage_members')
      .select('garage_id, role')
      .eq('user_id', userId);
    
    console.log("Staff garage memberships:", JSON.stringify(membershipData));
    console.log("Membership error:", membershipError);
    
    if (membershipData && membershipData.length > 0) {
      console.log("Staff is member of garage:", membershipData[0].garage_id);
      
      // Verify garage exists
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', membershipData[0].garage_id)
        .maybeSingle();
        
      if (garageExists) {
        // Update profile with garage_id
        await supabase
          .from('profiles')
          .update({ garage_id: membershipData[0].garage_id })
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
    }
    
    // Try to use a default garage as a fallback
    const { data: defaultGarage } = await supabase
      .from('garages')
      .select('id, name')
      .eq('slug', 'tractic')
      .maybeSingle();
      
    if (defaultGarage) {
      console.log("Found default Tractic garage:", defaultGarage.id);
      
      // Add user to this garage
      await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: defaultGarage.id, role: userRole }
        ]);
        
      // Update profile
      await supabase
        .from('profiles')
        .update({ garage_id: defaultGarage.id })
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
    
    // Last resort - find any garage
    const { data: anyGarage } = await supabase
      .from('garages')
      .select('id')
      .limit(1)
      .maybeSingle();
      
    if (anyGarage) {
      console.log("Found a garage to assign:", anyGarage.id);
      
      // Add user to this garage
      await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: anyGarage.id, role: userRole }
        ]);
        
      // Update profile
      await supabase
        .from('profiles')
        .update({ garage_id: anyGarage.id })
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
