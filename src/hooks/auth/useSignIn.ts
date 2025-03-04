
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
      // Use updated parameter names
      await supabase.rpc(
        'update_profile_garage',
        { 
          p_user_id: userId, 
          p_garage_id: ownedGarages[0].id 
        }
      );
    }
  };

  const handleStaffSignIn = async (userId: string, userRole: string) => {
    // Get user's garage assignment
    const { data: profileData } = await supabase
      .from('profiles')
      .select('garage_id')
      .eq('id', userId)
      .single();
      
    // If no garage_id, try to find one
    if (!profileData?.garage_id) {
      // Check if user is a member of any garage
      const { data: memberData } = await supabase
        .from('garage_members')
        .select('garage_id')
        .eq('user_id', userId)
        .limit(1);
        
      if (memberData && memberData.length > 0) {
        // Update profile with found garage using updated parameter names
        await supabase.rpc(
          'update_profile_garage',
          { 
            p_user_id: userId, 
            p_garage_id: memberData[0].garage_id 
          }
        );
      } else {
        // Try default 'tractic' garage
        const { data: defaultGarage } = await supabase
          .from('garages')
          .select('id')
          .eq('slug', 'tractic')
          .limit(1);
          
        if (defaultGarage && defaultGarage.length > 0) {
          const defaultGarageId = defaultGarage[0].id;
          
          await supabase
            .from('garage_members')
            .upsert([
              { user_id: userId, garage_id: defaultGarageId, role: userRole }
            ]);
            
          await supabase.rpc(
            'update_profile_garage',
            { 
              p_user_id: userId, 
              p_garage_id: defaultGarageId 
            }
          );
        } else {
          // Try any available garage
          const { data: anyGarage } = await supabase
            .from('garages')
            .select('id')
            .limit(1);
            
          if (anyGarage && anyGarage.length > 0) {
            await supabase
              .from('garage_members')
              .upsert([
                { user_id: userId, garage_id: anyGarage[0].id, role: userRole }
              ]);
              
            await supabase.rpc(
              'update_profile_garage',
              { 
                p_user_id: userId, 
                p_garage_id: anyGarage[0].id 
              }
            );
          } else {
            throw new Error("No garages found in the system. Please contact an administrator.");
          }
        }
      }
    }
  };

  return {
    signIn,
    verifyUserAccess,
    handleOwnerSignIn,
    handleStaffSignIn
  };
};
