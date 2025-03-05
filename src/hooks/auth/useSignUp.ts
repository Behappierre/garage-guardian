
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
    // Find any garage
    const { data: anyGarage, error: anyGarageError } = await supabase
      .from('garages')
      .select('id')
      .limit(1);
      
    if (anyGarageError) {
      throw new Error("Could not find any garage to assign you to");
    }
    
    let garageId = null;
    
    if (anyGarage && anyGarage.length > 0) {
      garageId = anyGarage[0].id;
    } else {
      throw new Error("No garages exist in the system. Please contact an administrator.");
    }
    
    // Update user_roles with garage ID
    const { error: userRoleError } = await supabase
      .from('user_roles')
      .update({ garage_id: garageId })
      .eq('user_id', userId);
      
    if (userRoleError) throw userRoleError;
    
    return garageId;
  };

  return {
    signUp,
    assignRole,
    assignStaffToGarage
  };
};
