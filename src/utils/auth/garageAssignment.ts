
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "@/types/garage";

/**
 * Ensures a user has a garage assigned to their profile
 * Using a simplified approach to reduce complexity
 */
export async function ensureUserHasGarage(userId: string, userRole: string) {
  console.log(`Ensuring user ${userId} with role ${userRole} has a garage assigned`);
  
  // CHECK 1: First check for a valid garage in the user's profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('garage_id')
    .eq('id', userId)
    .maybeSingle();
  
  console.log("Profile data:", JSON.stringify(profileData));
  
  if (profileData?.garage_id) {
    console.log("User has garage_id in profile:", profileData.garage_id);
    
    // Verify this garage exists
    const { data: garageExists } = await supabase
      .from('garages')
      .select('id')
      .eq('id', profileData.garage_id)
      .maybeSingle();
    
    console.log("Garage existence check:", JSON.stringify(garageExists));
      
    if (garageExists) {
      console.log("Verified garage exists:", garageExists.id);
      
      // Ensure user is in garage_members for this garage
      const { data: memberExists } = await supabase
        .from('garage_members')
        .select('id')
        .eq('user_id', userId)
        .eq('garage_id', profileData.garage_id)
        .maybeSingle();
      
      if (!memberExists) {
        console.log("Adding user to garage_members for consistency");
        
        // DEBUGGING: Try direct SQL insertion if the supabase.from approach fails
        try {
          await supabase.rpc('execute_read_only_query', {
            query_text: `
              SELECT * FROM garage_members
              WHERE user_id = '${userId}'::uuid 
              AND garage_id = '${profileData.garage_id}'::uuid
            `
          });
        } catch (err) {
          console.error("Error with direct SQL check:", err);
        }
        
        // Also try the normal approach
        try {
          await supabase
            .from('garage_members')
            .upsert([
              { 
                user_id: userId, 
                garage_id: profileData.garage_id, 
                role: userRole === 'administrator' ? 'owner' : userRole 
              }
            ]);
        } catch (err) {
          console.error("Error with normal upsert:", err);
        }
          
        // Verify the insert worked
        const { data: verifyInsert } = await supabase.rpc('execute_read_only_query', {
          query_text: `
            SELECT * FROM garage_members 
            WHERE user_id = '${userId}'::uuid 
            AND garage_id = '${profileData.garage_id}'::uuid
          `
        });
        console.log("VERIFY MEMBER INSERT RESULT:", verifyInsert);
      }
      
      return true;
    }
    
    console.log("Garage in profile does not exist, will try other options");
  }
  
  // CHECK 2: Check if user is a member of any garage
  const { data: membershipData } = await supabase
    .from('garage_members')
    .select('garage_id, role')
    .eq('user_id', userId);
  
  console.log("Membership data:", JSON.stringify(membershipData));
  
  if (membershipData && membershipData.length > 0) {
    // Pick the first garage membership
    const garageId = membershipData[0].garage_id;
    console.log("User is member of garage:", garageId);
    
    // Verify this garage exists
    const { data: garageExists } = await supabase
      .from('garages')
      .select('id')
      .eq('id', garageId)
      .maybeSingle();
    
    if (garageExists) {
      console.log("Verified member's garage exists:", garageExists.id);
      
      // Update profile with garage_id
      try {
        await supabase
          .from('profiles')
          .update({ garage_id: garageId })
          .eq('id', userId);
      } catch (error) {
        console.error("Error updating profile with garage_id:", error);
      }
      
      return true;
    }
  }
  
  // CHECK 3: If user is an administrator, check for owned garages
  if (userRole === 'administrator') {
    console.log("Checking if admin owns any garages");
    
    const { data: ownedGarages } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId);
    
    console.log("Owned garages:", JSON.stringify(ownedGarages));
    
    if (ownedGarages && ownedGarages.length > 0) {
      const garageId = ownedGarages[0].id;
      console.log("Admin owns garage:", garageId);
      
      // Make sure admin is a member of their owned garage
      try {
        await supabase
          .from('garage_members')
          .upsert([
            { user_id: userId, garage_id: garageId, role: 'owner' }
          ]);
      } catch (err) {
        console.error("Error upserting garage member:", err);
      }
      
      // Update profile
      try {
        await supabase
          .from('profiles')
          .update({ garage_id: garageId })
          .eq('id', userId);
      } catch (error) {
        console.error("Error updating profile for admin:", error);
      }
      
      return true;
    }
  }
  
  // CHECK 4: Look for a default garage by slug
  console.log("Checking for default 'tractic' garage");
  
  const { data: defaultGarage } = await supabase
    .from('garages')
    .select('id')
    .eq('slug', 'tractic')
    .maybeSingle();
  
  console.log("Default garage check:", JSON.stringify(defaultGarage));
  
  if (defaultGarage) {
    console.log("Found default 'tractic' garage:", defaultGarage.id);
    
    try {
      // Try normal approach
      try {
        await supabase
          .from('garage_members')
          .upsert([
            { 
              user_id: userId, 
              garage_id: defaultGarage.id, 
              role: userRole === 'administrator' ? 'owner' : userRole 
            }
          ]);
      } catch (err) {
        console.error("Error with normal upsert for default garage:", err);
      }
      
      // Update profile
      await supabase
        .from('profiles')
        .update({ garage_id: defaultGarage.id })
        .eq('id', userId);
        
      // Verify both operations worked
      const { data: verifyInsert } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT * FROM garage_members 
          WHERE user_id = '${userId}'::uuid 
          AND garage_id = '${defaultGarage.id}'::uuid
        `
      });
      console.log("VERIFY DEFAULT GARAGE MEMBER INSERT:", verifyInsert);
      
      const { data: verifyProfileUpdate } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT garage_id FROM profiles 
          WHERE id = '${userId}'::uuid
        `
      });
      console.log("VERIFY DEFAULT GARAGE PROFILE UPDATE:", verifyProfileUpdate);
      
      return true;
    } catch (error) {
      console.error("Error adding user to default garage:", error);
    }
  }
  
  // CHECK 5: Last resort - find any garage in the system
  console.log("Looking for any garage as last resort");
  
  const { data: anyGarage } = await supabase
    .from('garages')
    .select('id')
    .limit(1)
    .maybeSingle();
  
  console.log("Any garage check:", JSON.stringify(anyGarage));
  
  if (anyGarage) {
    console.log("Found a garage to assign:", anyGarage.id);
    
    try {
      // Try normal approach
      try {
        await supabase
          .from('garage_members')
          .upsert([
            { 
              user_id: userId, 
              garage_id: anyGarage.id, 
              role: userRole === 'administrator' ? 'owner' : userRole 
            }
          ]);
      } catch (err) {
        console.error("Error with normal upsert for any garage:", err);
      }
      
      // Update profile
      await supabase
        .from('profiles')
        .update({ garage_id: anyGarage.id })
        .eq('id', userId);
        
      // Verify both operations
      const { data: verifyInsert } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT * FROM garage_members 
          WHERE user_id = '${userId}'::uuid 
          AND garage_id = '${anyGarage.id}'::uuid
        `
      });
      console.log("VERIFY ANY GARAGE MEMBER INSERT:", verifyInsert);
      
      const { data: verifyProfileUpdate } = await supabase.rpc('execute_read_only_query', {
        query_text: `
          SELECT garage_id FROM profiles 
          WHERE id = '${userId}'::uuid
        `
      });
      console.log("VERIFY ANY GARAGE PROFILE UPDATE:", verifyProfileUpdate);
      
      return true;
    } catch (error) {
      console.error("Error adding user to last resort garage:", error);
    }
  }
  
  // No garage found
  console.log("No garage found in the system");
  return false;
}

/**
 * Assigns a user to a specific garage
 */
export async function assignUserToGarage(userId: string, garageId: string, userRole: string) {
  if (!userId || !garageId) {
    console.error("Missing required user ID or garage ID");
    return false;
  }
  
  try {
    console.log(`Assigning user ${userId} to garage ${garageId} with role ${userRole}`);
    
    // Verify the garage exists
    const { data: garageCheck } = await supabase
      .from('garages')
      .select('id')
      .eq('id', garageId)
      .maybeSingle();
    
    console.log("Garage check result:", JSON.stringify(garageCheck));
    
    if (!garageCheck) {
      console.error("Garage does not exist:", garageId);
      return false;
    }
    
    // Add user as member
    const { error: memberError } = await supabase
      .from('garage_members')
      .upsert([
        { user_id: userId, garage_id: garageId, role: userRole }
      ]);
    
    console.log("Garage member upsert error:", memberError);
      
    if (memberError) {
      console.error("Error adding user to garage:", memberError);
      return false;
    }
    
    // Update profile with garage ID
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
    
    console.log("Profile update error:", profileError);
      
    if (profileError) {
      console.error("Error updating profile with garage ID:", profileError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error assigning user to garage:", error);
    return false;
  }
}
