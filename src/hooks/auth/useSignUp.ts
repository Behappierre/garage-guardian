
import { supabase } from "@/integrations/supabase/client";

type Role = "administrator" | "technician" | "front_desk";
type UserType = "owner" | "staff";

export const useSignUp = () => {
  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    role: Role, 
    userType: UserType
  ) => {
    const userRole = userType === "owner" ? "administrator" : role;
    
    console.log(`Signing up user with role: ${userRole}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    
    if (signUpError) throw signUpError;
    
    if (signUpData.user) {
      await assignRole(signUpData.user.id, userRole);
      return signUpData.user;
    }
    
    return null;
  };

  const assignRole = async (userId: string, role: string) => {
    // Fixed: Use typed role and ensure we're inserting a single object, not an array
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role as Role // Cast to the Role type
      });
    
    if (roleError) throw roleError;
  };

  const assignStaffToGarage = async (userId: string, role: string) => {
    // Try to find default garage
    const { data: defaultGarage, error: defaultGarageError } = await supabase
      .from('garages')
      .select('id')
      .eq('slug', 'tractic')
      .limit(1);
      
    if (defaultGarageError) {
      console.error("Error finding default garage:", defaultGarageError);
      throw new Error("Could not find a default garage to assign you to");
    }
    
    let garageId = null;
    
    if (defaultGarage && defaultGarage.length > 0) {
      garageId = defaultGarage[0].id;
    } else {
      // Try any garage
      const { data: anyGarage, error: anyGarageError } = await supabase
        .from('garages')
        .select('id')
        .limit(1);
        
      if (anyGarageError) {
        throw new Error("Could not find any garage to assign you to");
      }
      
      if (anyGarage && anyGarage.length > 0) {
        garageId = anyGarage[0].id;
      } else {
        throw new Error("No garages exist in the system. Please contact an administrator.");
      }
    }
    
    // Add user as garage member
    const { error: garageMemberError } = await supabase
      .from('garage_members')
      .insert({
        user_id: userId,
        garage_id: garageId,
        role: role as Role // Cast to the Role type
      });
      
    if (garageMemberError) throw garageMemberError;
    
    // Update profile with garage ID
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
      
    if (profileError) throw profileError;
    
    return garageId;
  };

  return {
    signUp,
    assignRole,
    assignStaffToGarage
  };
};
