
import { supabase } from "@/integrations/supabase/client";
import { repairUserGarageRelationships } from "@/utils/auth/garageAccess";
import { ensureUserHasGarage } from "@/utils/auth/garageAssignment";

/**
 * Assigns a user to the default "tractic" garage or creates one if it doesn't exist
 */
export async function assignDefaultGarage(userId: string, userRole: string): Promise<boolean> {
  try {
    console.log("Attempting to assign default garage for user:", userId);
    
    // 1. First try to find the default "tractic" garage with properly qualified columns
    const { data: defaultGarageResult } = await supabase.rpc('execute_read_only_query', {
      query_text: `
        SELECT g.id 
        FROM garages g
        WHERE g.slug = 'tractic'
        LIMIT 1
      `
    });
    
    // Check if we have results for default garage
    const defaultGarage = defaultGarageResult as any[] | null;
    if (!defaultGarage || defaultGarage.length === 0) {
      console.log("Default 'tractic' garage not found, checking for any garage");
      
      // Try to find any garage
      const { data: anyGarageResult } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT g.id 
          FROM garages g
          LIMIT 1
        `
      });
      
      // Check if we have results for any garage
      const anyGarage = anyGarageResult as any[] | null;
      if (!anyGarage || anyGarage.length === 0) {
        console.log("No garages found, creating a default one");
        
        // Create a default garage
        const { data: newGarage, error: createError } = await supabase
          .from('garages')
          .insert({
            name: 'Default Garage',
            slug: 'default',
            owner_id: userId
          })
          .select()
          .single();
        
        if (createError) {
          console.error("Error creating default garage:", createError);
          return false;
        }
        
        // Use the new garage
        const garageId = newGarage.id;
        console.log("Created new default garage with ID:", garageId);
        
        // Add user as member
        await supabase
          .from('garage_members')
          .insert({
            user_id: userId,
            garage_id: garageId,
            role: userRole || 'owner'
          });
        
        // Update profile
        await supabase
          .from('profiles')
          .update({ garage_id: garageId })
          .eq('id', userId);
        
        return true;
      }
      
      const garageId = anyGarage[0].id;
      console.log("Found existing garage to assign:", garageId);
      
      // Add user as member
      await supabase
        .from('garage_members')
        .insert({
          user_id: userId,
          garage_id: garageId,
          role: userRole || 'member'
        });
      
      // Update profile
      await supabase
        .from('profiles')
        .update({ garage_id: garageId })
        .eq('id', userId);
      
      return true;
    }
    
    const garageId = defaultGarage[0].id;
    console.log("Found default 'tractic' garage:", garageId);
    
    // Add user as member
    const { error: memberError } = await supabase
      .from('garage_members')
      .insert({
        user_id: userId,
        garage_id: garageId,
        role: userRole || 'member'
      });
    
    if (memberError) {
      console.error("Error adding member:", memberError);
      return false;
    }
    
    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
    
    if (profileError) {
      console.error("Error updating profile:", profileError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error assigning default garage:", error);
    return false;
  }
}

/**
 * Handles staff-specific sign-in logic
 */
export async function handleStaffSignIn(userId: string, userRole: string) {
  console.log("Handling staff sign in for user:", userId, "with role:", userRole);
  
  try {
    // First try to repair any garage relationships
    const relationshipsRepaired = await repairUserGarageRelationships(userId);
    console.log("Staff relationships repaired:", relationshipsRepaired);
    
    if (relationshipsRepaired) {
      // If relationships were repaired successfully, we're done
      console.log("Staff garage relationships were repaired successfully");
      return;
    }
    
    // First check if user already has a garage assignment
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
    
    console.log("Staff profile data:", JSON.stringify(profileData));
      
    // If profile has a garage_id, verify it exists
    if (profileData?.garage_id) {
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', profileData.garage_id)
        .maybeSingle();
        
      if (garageExists) {
        console.log("Staff garage exists, ensuring membership");
        
        // Ensure user is a member of this garage
        await supabase
          .from('garage_members')
          .upsert([{
            user_id: userId,
            garage_id: profileData.garage_id,
            role: userRole
          }]);
          
        // DEBUGGING: Verify member insert
        const { data: verifyMemberInsert } = await supabase.rpc('execute_read_only_query', {
          query_text: `SELECT * FROM garage_members WHERE user_id = '${userId}'::uuid AND garage_id = '${profileData.garage_id}'::uuid`
        });
        console.log("VERIFY STAFF MEMBER INSERT:", verifyMemberInsert);
          
        return;
      }
    }
      
    // Try to ensure user has a garage
    const hasGarage = await ensureUserHasGarage(userId, userRole);
    console.log("Staff ensureUserHasGarage result:", hasGarage);
    
    if (!hasGarage) {
      // Try the new assignDefaultGarage function
      const assigned = await assignDefaultGarage(userId, userRole);
      
      if (!assigned) {
        throw new Error("Could not create or assign a default garage");
      }
      
      return;
    }
    
    // Re-verify that profile now has a garage_id after ensureUserHasGarage
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .maybeSingle();
      
    if (!updatedProfile?.garage_id) {
      throw new Error("System error: Failed to assign garage to your profile. Please contact support.");
    }
  } catch (error) {
    console.error("Error in handleStaffSignIn:", error);
    throw error; // Re-throw to be handled by the calling function
  }
}
