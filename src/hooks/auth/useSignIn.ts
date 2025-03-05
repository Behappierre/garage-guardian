
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
      // Check for owned garages
      const { data: ownedGarages, error: ownedError } = await supabase
        .from('garages')
        .select('id')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
        
      if (ownedError) {
        console.error("Error checking owned garages:", ownedError);
      }
      
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
      } else {
        console.log("Owner has no owned garages");
      }
    } catch (error) {
      console.error("Error in handleOwnerSignIn:", error);
      // Continue execution, as this is not critical
    }
  };

  const handleStaffSignIn = async (userId: string, userRole: string) => {
    console.log("Handling staff sign in for user:", userId, "with role:", userRole);
    
    try {
      // Ensure the user has a garage assignment with improved error handling
      const hasGarage = await ensureUserHasGarage(userId, userRole);
      
      if (!hasGarage) {
        console.log("Staff has no garage assignment");
        throw new Error("You don't have access to any garages. Please contact an administrator.");
      }
      
      // Double-check that profile has garage_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', userId)
        .single();
        
      if (!profileData?.garage_id) {
        console.log("Staff has no garage_id in profile after ensureUserHasGarage");
        
        // One last attempt - check memberships directly
        const { data: memberData } = await supabase
          .from('garage_members')
          .select('garage_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (memberData && memberData.length > 0) {
          // First verify the garage exists
          const { data: garageExists } = await supabase
            .from('garages')
            .select('id')
            .eq('id', memberData[0].garage_id)
            .single();
            
          if (garageExists) {
            // Update profile with this garage_id
            await supabase
              .from('profiles')
              .update({ garage_id: memberData[0].garage_id })
              .eq('id', userId);
          } else {
            throw new Error("Your assigned garage no longer exists. Please contact an administrator.");
          }
        } else {
          throw new Error("You don't have access to any garages. Please contact an administrator.");
        }
      } else {
        // Verify the garage_id in profile actually exists
        const { data: garageExists } = await supabase
          .from('garages')
          .select('id')
          .eq('id', profileData.garage_id)
          .single();
          
        if (!garageExists) {
          throw new Error("Your assigned garage no longer exists. Please contact an administrator.");
        }
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
