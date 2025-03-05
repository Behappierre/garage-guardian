
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const fetchUserGarage = async (userId: string, fetchingGarage: boolean): Promise<string | null> => {
  if (fetchingGarage || !userId) return null;
  
  try {
    console.log("Fetching garage for user:", userId);
    
    // Check if current URL contains source=staff for admins
    const isAdminFromStaff = window.location.search.includes('source=staff');
    
    // Get user role first
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    const isAdmin = roleData?.role === 'administrator';
    
    // Skip garage fetching for admins coming from staff login
    // This forces them to explicitly select a garage
    if (isAdmin && isAdminFromStaff && window.location.pathname.includes('/garage-management')) {
      console.log("Admin from staff login, skipping automatic garage fetch");
      return null;
    }
    
    // First try to get garage from profile
    let foundGarageId = null;
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error("Error fetching profile:", profileError);
    } else if (profileData?.garage_id) {
      console.log("Found garage_id in profile:", profileData.garage_id);
      foundGarageId = profileData.garage_id;
    }
    
    // If not found in profile, check user_roles
    if (!foundGarageId) {
      const { data: userRoleData, error: userRoleError } = await supabase
        .from('user_roles')
        .select('garage_id')
        .eq('user_id', userId)
        .single();
        
      if (userRoleError) {
        console.error("Error fetching user_role:", userRoleError);
      } else if (userRoleData?.garage_id) {
        console.log("Found garage_id in user_roles:", userRoleData.garage_id);
        foundGarageId = userRoleData.garage_id;
        
        // Update profile with this garage_id for consistency
        await supabase
          .from('profiles')
          .update({ garage_id: foundGarageId })
          .eq('id', userId);
      }
    }
    
    // If not found in user_roles, check garage_members
    if (!foundGarageId) {
      const { data: memberData, error: memberError } = await supabase
        .from('garage_members')
        .select('garage_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (memberError) {
        console.error("Error fetching garage_members:", memberError);
      } else if (memberData?.garage_id) {
        console.log("Found garage_id in garage_members:", memberData.garage_id);
        foundGarageId = memberData.garage_id;
        
        // Update profile and user_roles with this garage_id for consistency
        await supabase
          .from('profiles')
          .update({ garage_id: foundGarageId })
          .eq('id', userId);
          
        await supabase
          .from('user_roles')
          .update({ garage_id: foundGarageId })
          .eq('user_id', userId);
      }
    }
    
    return foundGarageId;
  } catch (error) {
    console.error("Error fetching user garage:", error);
    toast.error("Error finding your garage. Please try again or contact support.");
    return null;
  }
};
