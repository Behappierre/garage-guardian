import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Verifies a user's role
 */
export async function verifyUserRole(userId: string) {
  try {
    console.log("Fetching user role for:", userId);
    
    // Check user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, garage_id')
      .eq('user_id', userId);
      
    if (roleError) {
      console.error("Error fetching user role:", roleError);
      return { hasError: true, role: null };
    }
    
    if (!roleData || roleData.length === 0) {
      console.log("No user roles found");
      return { hasError: true, role: null };
    }
    
    // Prioritize administrator role if it exists
    const adminRole = roleData.find(r => r.role === 'administrator');
    if (adminRole) {
      console.log("User has administrator role", "Garage ID:", adminRole.garage_id);
      return { hasError: false, role: 'administrator' };
    }
    
    // Then check for technician role
    const techRole = roleData.find(r => r.role === 'technician');
    if (techRole) {
      console.log("User has technician role", "Garage ID:", techRole.garage_id);
      return { hasError: false, role: 'technician' };
    }
    
    // Finally check for front_desk role
    const frontDeskRole = roleData.find(r => r.role === 'front_desk');
    if (frontDeskRole) {
      console.log("User has front_desk role", "Garage ID:", frontDeskRole.garage_id);
      return { hasError: false, role: 'front_desk' };
    }
    
    // If we get here, user has some role but none of the ones we specifically check for
    console.log("User has role:", roleData[0]?.role, "Garage ID:", roleData[0]?.garage_id);
    return { hasError: false, role: roleData[0]?.role };
  } catch (error: any) {
    console.error("Error verifying user role:", error.message);
    return { hasError: true, role: null };
  }
}

/**
 * Verifies a user's access to garage management
 */
export async function verifyGarageManagementAccess(userId: string, role: string | null) {
  // Only allow administrators to access garage management
  return role === 'administrator';
}

/**
 * Verifies a user's access to the dashboard
 */
export async function verifyDashboardAccess(userId: string, role: string | null) {
  // Check if role is valid for dashboard access
  if (!['administrator', 'technician', 'front_desk'].includes(role || '')) {
    console.log("User has invalid role for dashboard:", role);
    toast({
      title: "Access Denied",
      description: "You don't have permission to access this area",
      variant: "destructive"
    });
    return false;
  }
  
  return true;
}

/**
 * Ensures a user has a garage_id in their profile
 */
export async function ensureUserHasGarage(userId: string, role: string) {
  try {
    // First check user_roles for a garage_id - direct association
    const { data: userRoleData } = await supabase
      .from('user_roles')
      .select('garage_id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (userRoleData?.garage_id) {
      console.log("User has garage_id in user_roles:", userRoleData.garage_id);
      
      // Ensure profile has the same garage_id
      await supabase
        .from('profiles')
        .update({ garage_id: userRoleData.garage_id })
        .eq('id', userId);
        
      return true;
    }
    
    // Check profile for a garage_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileData?.garage_id) {
      console.log("User has garage_id in profile:", profileData.garage_id);
      
      // Update user_roles with profile's garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: profileData.garage_id })
        .eq('user_id', userId);
        
      return true;
    }
    
    // If admin, check owned garages first
    if (role === 'administrator') {
      const { data: ownedGarages } = await supabase
        .from('garages')
        .select('id')
        .eq('owner_id', userId)
        .limit(1);
        
      if (ownedGarages && ownedGarages.length > 0) {
        console.log("Admin owns garage:", ownedGarages[0].id);
        
        // Update user_roles with owned garage_id
        await supabase
          .from('user_roles')
          .update({ garage_id: ownedGarages[0].id })
          .eq('user_id', userId);
        
        // Update profile with owned garage
        await supabase
          .from('profiles')
          .update({ garage_id: ownedGarages[0].id })
          .eq('id', userId);
          
        return true;
      }
    }
    
    // Check if user is a member of any garage
    const { data: memberData } = await supabase
      .from('garage_members')
      .select('garage_id')
      .eq('user_id', userId)
      .limit(1);
      
    if (memberData && memberData.length > 0) {
      console.log("User is a member of garage:", memberData[0].garage_id);
      
      // Update user_roles with garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: memberData[0].garage_id })
        .eq('user_id', userId);
      
      // Update profile with found garage_id
      await supabase
        .from('profiles')
        .update({ garage_id: memberData[0].garage_id })
        .eq('id', userId);
        
      return true;
    }
    
    // Try to use default Tractic garage
    const { data: defaultGarage } = await supabase
      .from('garages')
      .select('id')
      .eq('slug', 'tractic')
      .limit(1);
      
    if (defaultGarage && defaultGarage.length > 0) {
      const defaultGarageId = defaultGarage[0].id;
      console.log("Adding user to default Tractic garage:", defaultGarageId);
      
      // Update user_roles with garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: defaultGarageId })
        .eq('user_id', userId);
      
      // Add user as member
      await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: defaultGarageId, role: role }
        ]);
        
      // Update profile
      await supabase
        .from('profiles')
        .update({ garage_id: defaultGarageId })
        .eq('id', userId);
        
      return true;
    }
    
    // If no default garage, find any available garage
    const { data: anyGarage } = await supabase
      .from('garages')
      .select('id')
      .limit(1);
      
    if (anyGarage && anyGarage.length > 0) {
      console.log("Adding user to available garage:", anyGarage[0].id);
      
      // Update user_roles with garage_id
      await supabase
        .from('user_roles')
        .update({ garage_id: anyGarage[0].id })
        .eq('user_id', userId);
      
      // Add user as member
      await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: anyGarage[0].id, role: role }
        ]);
        
      // Update profile
      await supabase
        .from('profiles')
        .update({ garage_id: anyGarage[0].id })
        .eq('id', userId);
        
      return true;
    } else {
      console.error("No garages available in the system");
      throw new Error("No garages available in the system");
    }
  } catch (error: any) {
    console.error("Error in ensureUserHasGarage:", error.message);
    return false;
  }
}
