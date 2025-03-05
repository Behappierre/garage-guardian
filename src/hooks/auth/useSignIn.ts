
import { supabase } from "@/integrations/supabase/client";

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
    // Check for owned garages
    const { data: ownedGarages, error: ownedError } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);
      
    if (ownedError) {
      console.error("Error checking owned garages:", ownedError);
    }
    
    if (ownedGarages && ownedGarages.length > 0) {
      // Ensure user's profile has the garage_id set
      await supabase
        .from('profiles')
        .update({ garage_id: ownedGarages[0].id })
        .eq('id', userId);
        
      // Add user as member of their owned garage
      await supabase
        .from('garage_members')
        .upsert([{ 
          user_id: userId, 
          garage_id: ownedGarages[0].id,
          role: 'owner'
        }]);
    }
  };

  const handleStaffSignIn = async (userId: string, userRole: string) => {
    // First check if user has a garage in their profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .single();
      
    if (profileData?.garage_id) {
      console.log("User has garage_id in profile:", profileData.garage_id);
      return;
    }
    
    // Check if user is a member of any garage
    const { data: memberData } = await supabase
      .from('garage_members')
      .select('garage_id')
      .eq('user_id', userId)
      .limit(1);
        
    if (memberData && memberData.length > 0) {
      console.log("User is a member of garage:", memberData[0].garage_id);
      
      // Update profile with garage_id
      await supabase
        .from('profiles')
        .update({ garage_id: memberData[0].garage_id })
        .eq('id', userId);
      
      return;
    }
    
    // No garage found
    throw new Error("You don't have access to any garages. Please contact an administrator.");
  };

  return {
    signIn,
    verifyUserAccess,
    handleOwnerSignIn,
    handleStaffSignIn
  };
};
