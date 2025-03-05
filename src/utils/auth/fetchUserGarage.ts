
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkSourceParam, verifyGarageExists } from "./fetchUserGarage/helpers";
import { getGarageFromProfile } from "./fetchUserGarage/profileGarage";
import { getGarageFromUserRoles } from "./fetchUserGarage/userRolesGarage";
import { getGarageFromMembership } from "./fetchUserGarage/membershipGarage";
import { updateUserProfileWithGarage } from "./fetchUserGarage/updateProfile";

export const fetchUserGarage = async (userId: string, fetchingGarage: boolean): Promise<string | null> => {
  if (fetchingGarage || !userId) return null;
  
  try {
    console.log("Fetching garage for user:", userId);
    
    // Check if current URL contains source=staff for admins
    const isAdminFromStaff = checkSourceParam();
    
    // Get user role first
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, garage_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    const isAdmin = roleData?.role === 'administrator';
    console.log("User role info:", roleData);
    
    // Skip garage fetching for admins coming from staff login
    // This forces them to explicitly select a garage
    if (isAdmin && isAdminFromStaff && window.location.pathname.includes('/garage-management')) {
      console.log("Admin from staff login, skipping automatic garage fetch");
      return null;
    }
    
    // First try to get garage from profile
    let foundGarageId = null;
    
    // Try to find garage from different sources in order of priority
    foundGarageId = await getGarageFromProfile(userId);
    
    // If not found in profile, check user_roles
    if (!foundGarageId && roleData?.garage_id) {
      foundGarageId = await getGarageFromUserRoles(userId, roleData.garage_id);
    }
    
    // If not found in user_roles or profile, check garage_members
    if (!foundGarageId) {
      foundGarageId = await getGarageFromMembership(userId);
    }
    
    // If we found a garage ID, log it clearly
    if (foundGarageId) {
      console.log("=== SELECTED GARAGE ID ===", foundGarageId);
    } else {
      console.log("No garage ID found for user:", userId);
    }
    
    return foundGarageId;
  } catch (error) {
    console.error("Error fetching user garage:", error);
    toast.error("Error finding your garage. Please try again or contact support.");
    return null;
  }
};
