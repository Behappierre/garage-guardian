
import { supabase } from "@/integrations/supabase/client";
import { ensureUserHasGarage } from "@/utils/auth/garageAssignment";

export const useSignIn = () => {
  const signIn = async (email: string, password: string, userType: "owner" | "staff") => {
    console.log(`Signing in user ${email} as ${userType} type`);
    
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return signInData;
  };

  const verifyUserAccess = async (userId: string, userType: "owner" | "staff") => {
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError) {
      console.error("Error fetching user role:", roleError.message);
      throw new Error("Could not verify your account role");
    }

    console.log("User role check for access:", roleData?.role, "Trying to access as:", userType);

    if (userType === "owner" && roleData?.role !== 'administrator') {
      throw new Error("You don't have permission to access the garage owner area");
    }

    return roleData?.role;
  };

  const handleOwnerSignIn = async (userId: string) => {
    console.log("Handling owner sign in for user:", userId);
    
    try {
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
  };

  const handleStaffSignIn = async (userId: string, userRole: string) => {
    console.log("Handling staff sign in for user:", userId, "with role:", userRole);
    
    try {
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
        const { data: garageCount } = await supabase.rpc('execute_read_only_query', {
          query_text: `SELECT COUNT(*) FROM garages`
        });
        console.log("TOTAL GARAGE COUNT:", garageCount);
        
        // Fixed: Check if garageCount is an array and get the count value safely
        let totalGarages = 0;
        if (Array.isArray(garageCount) && garageCount.length > 0) {
          // Extract count value safely using type assertion 
          const countRecord = garageCount[0] as Record<string, any>;
          totalGarages = parseInt(countRecord.count as string);
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
  };

  return {
    signIn,
    verifyUserAccess,
    handleOwnerSignIn,
    handleStaffSignIn
  };
};

