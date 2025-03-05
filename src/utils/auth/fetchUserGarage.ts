
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
    
    // Get profile data with detailed logging
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
      
      // Verify this garage exists
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id, name')
        .eq('id', profileData.garage_id)
        .single();
      
      if (garageExists) {
        console.log("Verified garage exists:", garageExists.name);
      } else {
        console.log("Garage ID from profile doesn't exist, will try other sources");
        foundGarageId = null;
      }
    }
    
    // If not found in profile, check user_roles
    if (!foundGarageId && roleData?.garage_id) {
      console.log("Found garage_id in user_roles:", roleData.garage_id);
      
      // Verify this garage exists
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id, name')
        .eq('id', roleData.garage_id)
        .single();
      
      if (garageExists) {
        console.log("Verified garage from user_roles exists:", garageExists.name);
        foundGarageId = roleData.garage_id;
        
        // Update profile with this garage_id for consistency
        await supabase
          .from('profiles')
          .update({ garage_id: foundGarageId })
          .eq('id', userId);
          
        console.log("Updated profile with garage_id from user_roles");
      } else {
        console.log("Garage ID from user_roles doesn't exist, will try other sources");
      }
    }
    
    // If not found in user_roles or profile, check garage_members
    if (!foundGarageId) {
      const { data: memberData, error: memberError } = await supabase
        .from('garage_members')
        .select('garage_id, garages(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (memberError) {
        console.error("Error fetching garage_members:", memberError);
      } else if (memberData?.garage_id) {
        console.log("Found garage_id in garage_members:", memberData.garage_id);
        console.log("Garage name:", memberData.garages?.name);
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
          
        console.log("Updated profile and user_roles with garage_id from garage_members");
      }
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
