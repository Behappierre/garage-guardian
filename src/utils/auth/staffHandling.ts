
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logGarageAssignmentError } from "./garageDiagnostics";

/**
 * Assigns a user to the default "tractic" garage or creates one if it doesn't exist
 * Only uses the user_roles table for garage association
 */
export async function assignDefaultGarage(userId: string, userRole: string): Promise<boolean> {
  try {
    console.log(`Attempting to assign default garage for user ${userId}`);
    
    // Find the 'tractic' garage or any available garage
    const { data: garageData, error: garageError } = await supabase
      .from('garages')
      .select('id, name, slug')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (garageError || !garageData || garageData.length === 0) {
      console.error("No garages found:", garageError);
      return false;
    }
    
    // First try to find "tractic" garage
    let targetGarage = garageData.find(g => g.slug === 'tractic');
    
    // If not found, use the first available garage
    if (!targetGarage) {
      targetGarage = garageData[0];
    }
    
    console.log(`Assigning garage "${targetGarage.name}" (${targetGarage.id}) to user`);
    
    // Do operations one by one to avoid ambiguity
    // 1. Create garage_members entry
    const { error: memberError } = await supabase
      .from('garage_members')
      .upsert({
        user_id: userId,
        garage_id: targetGarage.id,
        role: userRole
      });
    
    if (memberError) {
      console.error("Error creating membership:", memberError);
      return false;
    }
    
    // 2. Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: targetGarage.id })
      .eq('id', userId);
    
    if (profileError) {
      console.error("Error updating profile:", profileError);
      return false;
    }
    
    // 3. Update user_roles with garage_id
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ garage_id: targetGarage.id })
      .eq('user_id', userId);
      
    if (roleError) {
      console.error("Error updating user_roles with garage_id:", roleError);
      return false;
    }
    
    console.log(`Successfully assigned user ${userId} to garage ${targetGarage.id}`);
    return true;
  } catch (error) {
    logGarageAssignmentError(error, "assignDefaultGarage");
    return false;
  }
}

/**
 * Handles staff-specific sign-in logic with improved error handling
 * Only uses the user_roles table for garage association
 */
export async function handleStaffSignIn(userId: string, userRole: string) {
  console.log("Handling staff sign in for user:", userId, "with role:", userRole);
  
  try {
    // STEP 1: First check user's profile for garage_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, garage_id')
      .eq('id', userId)
      .single();
    
    if (profileData?.garage_id) {
      console.log("Found garage_id in profile:", profileData.garage_id);
      // Verify this garage still exists
      const { data: garageData } = await supabase
        .from('garages')
        .select('id, name')
        .eq('id', profileData.garage_id)
        .single();
      
      if (garageData) {
        console.log("Valid garage found in profile:", garageData.name);
        return; // Valid garage found, exit
      }
    }
    
    // STEP 2: Check if user already has a valid garage assignment in user_roles
    const { data: userRoleData } = await supabase
      .from('user_roles')
      .select('role, garage_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log("Staff user_role data:", JSON.stringify(userRoleData));
      
    // If user_role has a garage_id, verify it exists
    if (userRoleData?.garage_id) {
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id, name')
        .eq('id', userRoleData.garage_id)
        .maybeSingle();
        
      if (garageExists) {
        console.log("Staff garage exists:", garageExists.name);
        return; // Exit early - garage exists!
      } else {
        console.log("Garage in user_role doesn't exist, will find another");
      }
    }
    
    // STEP 3: Check garage_members for this user
    const { data: memberData } = await supabase
      .from('garage_members')
      .select('garage_id, role')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (memberData && memberData.length > 0) {
      const memberGarageId = memberData[0].garage_id;
      console.log("Found garage in membership:", memberGarageId);
      
      // Update profile with this garage_id
      await supabase
        .from('profiles')
        .update({ garage_id: memberGarageId })
        .eq('id', userId);
      
      // Also update user_roles
      await supabase
        .from('user_roles')
        .update({ garage_id: memberGarageId })
        .eq('user_id', userId);
      
      return; // Valid garage found, exit
    }
    
    // STEP 4: If no garage found, assign default
    console.log("No garage found, attempting to assign default");
    const assigned = await assignDefaultGarage(userId, userRole);
    
    if (!assigned) {
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "Could not create or assign a default garage. Please contact support."
      });
      throw new Error("Could not create or assign a default garage");
    }
  } catch (error) {
    console.error("Error in handleStaffSignIn:", error);
    throw error; // Re-throw to be handled by the calling function
  }
}
