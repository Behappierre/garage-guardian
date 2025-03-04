
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
    const { data: ownedGarages, error: ownedError } = await supabase
      .from('garages')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);
      
    if (ownedError) {
      console.error("Error checking owned garages:", ownedError);
    }
    
    if (ownedGarages && ownedGarages.length > 0) {
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
    // Check if user is a member of any garage
    const { data: memberData } = await supabase
      .from('garage_members')
      .select('garage_id')
      .eq('user_id', userId)
      .limit(1);
        
    if (!memberData || memberData.length === 0) {
      // No garage found - we don't automatically assign one anymore
      throw new Error("You don't have access to any garages. Please contact an administrator.");
    }
  };

  return {
    signIn,
    verifyUserAccess,
    handleOwnerSignIn,
    handleStaffSignIn
  };
};
