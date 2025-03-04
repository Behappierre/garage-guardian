
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Verifies if a user has the appropriate role to access a specific route
 */
export async function verifyUserRole(userId: string) {
  try {
    console.log("Fetching user role for:", userId);
    
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (roleError) {
      console.error("Error fetching user role:", roleError.message);
      toast.error("Could not verify your account role");
      return { hasError: true, role: null };
    }

    console.log("User role:", roleData?.role);
    return { hasError: false, role: roleData?.role || null };
  } catch (error: any) {
    console.error("Error in verifyUserRole:", error.message);
    return { hasError: true, role: null };
  }
}

/**
 * Verifies if a user has access to garage management routes
 */
export async function verifyGarageManagementAccess(userId: string, userRole: string | null) {
  // Only administrators can access garage management
  if (userRole !== 'administrator') {
    console.log("User is not an administrator, blocking access to garage management");
    toast.error("You don't have permission to access garage management");
    return false;
  }
  
  return true;
}

/**
 * Verifies if a user has access to dashboard routes
 */
export async function verifyDashboardAccess(userId: string, userRole: string | null) {
  // Check if role is valid for dashboard access
  if (!['administrator', 'technician', 'front_desk'].includes(userRole || '')) {
    console.log("User has invalid role for dashboard:", userRole);
    toast.error("You don't have permission to access this area");
    return false;
  }
  
  return true;
}

/**
 * Ensures the user has a garage assigned to their profile
 */
export async function ensureUserHasGarage(userId: string, userRole: string) {
  try {
    // Check profile first
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .single();
      
    if (profileData?.garage_id) {
      console.log("User has garage_id in profile:", profileData.garage_id);
      return true;
    }
    
    // If admin, check owned garages first
    if (userRole === 'administrator') {
      const { data: ownedGarages } = await supabase
        .from('garages')
        .select('id')
        .eq('owner_id', userId)
        .limit(1);
        
      if (ownedGarages && ownedGarages.length > 0) {
        console.log("Admin owns garage:", ownedGarages[0].id);
        
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
      
      // Add user as member
      await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: defaultGarageId, role: userRole }
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
      
      // Add user as member
      await supabase
        .from('garage_members')
        .upsert([
          { user_id: userId, garage_id: anyGarage[0].id, role: userRole }
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
