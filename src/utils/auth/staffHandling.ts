
import { supabase } from "@/integrations/supabase/client";
import { repairUserGarageRelationships } from "@/utils/auth/garageAccess";
import { ensureUserHasGarage } from "@/utils/auth/garageAssignment";

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
      // DEBUGGING: Last effort - create a garage if none exist
      const { data: garageCountResult } = await supabase.rpc('execute_read_only_query', {
        query_text: `SELECT COUNT(*) FROM garages`
      });
      console.log("TOTAL GARAGE COUNT:", garageCountResult);
      
      // Extract count using string key from the first object
      let totalGarages = 0;
      if (Array.isArray(garageCountResult) && garageCountResult.length > 0) {
        const countObj = garageCountResult[0];
        if (typeof countObj === 'object' && countObj !== null) {
          // Find the count key (might be 'count' or another name)
          const countKey = Object.keys(countObj).find(key => 
            key.toLowerCase().includes('count')
          );
          
          if (countKey) {
            totalGarages = parseInt(String(countObj[countKey]), 10) || 0;
          }
        }
      }
      
      if (totalGarages === 0) {
        console.log("No garages exist, creating a default one");
        
        // Create a default garage as a last resort
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
          throw new Error("Could not create a default garage");
        }
        
        console.log("Created default garage:", newGarage);
        
        // Add user to this garage
        await supabase
          .from('garage_members')
          .insert({
            user_id: userId,
            garage_id: newGarage.id,
            role: userRole
          });
          
        // Update profile
        await supabase
          .from('profiles')
          .update({ garage_id: newGarage.id })
          .eq('id', userId);
          
        return;
      }
      
      throw new Error("You don't have access to any garages. Please contact an administrator.");
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
