
import { supabase } from "@/integrations/supabase/client";
import { repairUserGarageRelationships } from "./garageAccess";

/**
 * Handles owner-specific sign-in logic
 */
export async function handleOwnerSignIn(userId: string) {
  console.log("Handling owner sign in for user:", userId);
  
  try {
    // First try to repair any garage relationships
    const relationshipsRepaired = await repairUserGarageRelationships(userId);
    console.log("Owner relationships repaired:", relationshipsRepaired);
    
    if (relationshipsRepaired) {
      // If relationships were repaired successfully, we're done
      return;
    }
    
    // Check for owned garages first - most reliable approach
    const { data: ownedGarages } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId);
    
    console.log("Owner sign in - owned garages:", JSON.stringify(ownedGarages));
    
    // DEBUGGING: Check if the owner_id is correct with direct SQL
    const { data: directOwnerCheck } = await supabase.rpc('execute_read_only_query', {
      query_text: `SELECT COUNT(*) FROM garages WHERE owner_id = '${userId}'::uuid`
    });
    console.log("DIRECT OWNER CHECK:", directOwnerCheck);
      
    if (ownedGarages && ownedGarages.length > 0) {
      console.log("Owner has owned garages:", ownedGarages.length);
      
      // Ensure user's profile has the garage_id set
      await supabase
        .from('profiles')
        .update({ garage_id: ownedGarages[0].id })
        .eq('id', userId);
        
      // Add user as member of their owned garage if not already
      await supabase
        .from('garage_members')
        .upsert([{ 
          user_id: userId, 
          garage_id: ownedGarages[0].id,
          role: 'owner'
        }]);
        
      // DEBUGGING: Verify the operations succeeded
      const { data: verifyProfileUpdate } = await supabase.rpc('execute_read_only_query', {
        query_text: `SELECT garage_id FROM profiles WHERE id = '${userId}'::uuid`
      });
      console.log("VERIFY OWNER PROFILE UPDATE:", verifyProfileUpdate);
      
      const { data: verifyMemberInsert } = await supabase.rpc('execute_read_only_query', {
        query_text: `SELECT * FROM garage_members WHERE user_id = '${userId}'::uuid AND garage_id = '${ownedGarages[0].id}'::uuid`
      });
      console.log("VERIFY OWNER MEMBER INSERT:", verifyMemberInsert);
      
      return;
    }
    
    // Check if user is a member of any garage
    const { data: memberData } = await supabase
      .from('garage_members')
      .select('garage_id, role')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log("Owner sign in - existing memberships:", JSON.stringify(memberData));
    
    // DEBUGGING: Direct SQL check for memberships
    const { data: directMemberCheck } = await supabase.rpc('execute_read_only_query', {
      query_text: `SELECT * FROM garage_members WHERE user_id = '${userId}'::uuid`
    });
    console.log("DIRECT MEMBER CHECK:", directMemberCheck);
    
    if (memberData?.garage_id) {
      // Verify this garage exists
      const { data: garageExists } = await supabase
        .from('garages')
        .select('id')
        .eq('id', memberData.garage_id)
        .maybeSingle();
        
      if (garageExists) {
        // Update profile with this garage_id
        await supabase
          .from('profiles')
          .update({ garage_id: memberData.garage_id })
          .eq('id', userId);
          
        // DEBUGGING: Verify the update
        const { data: verifyUpdate } = await supabase.rpc('execute_read_only_query', {
          query_text: `SELECT garage_id FROM profiles WHERE id = '${userId}'::uuid`
        });
        console.log("VERIFY MEMBER PROFILE UPDATE:", verifyUpdate);
      }
    }
    
    // Keep going - we don't need to throw an error 
    // If no garage is found, the garage management page 
    // will show an empty state and allow creating one
  } catch (error) {
    console.error("Error in handleOwnerSignIn:", error);
    // Continue execution, as this is not critical for navigation
  }
}
