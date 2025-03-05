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
        
        return;
      }
      
      // Check if user is a member of any garage
      const { data: memberData } = await supabase
        .from('garage_members')
        .select('garage_id, role')
        .eq('user_id', userId)
        .maybeSingle();
      
      console.log("Owner sign in - existing memberships:", JSON.stringify(memberData));
      
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
            
          return;
        }
      }
        
      // Try to ensure user has a garage
      const hasGarage = await ensureUserHasGarage(userId, userRole);
      console.log("Staff ensureUserHasGarage result:", hasGarage);
      
      if (!hasGarage) {
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
