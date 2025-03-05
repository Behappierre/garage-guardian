
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Role = Database['public']['Enums']['app_role'];
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
      
      // If this is a staff member (not an owner), automatically assign them to a garage
      if (userType === "staff") {
        await assignStaffToGarage(signUpData.user.id, userRole);
      }
      
      return signUpData.user;
    }
    
    return null;
  };

  const assignRole = async (userId: string, role: string) => {
    // Ensure we're inserting a single object with the role properly cast to the Role type
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
      .select('id, name')
      .limit(1);
      
    if (anyGarageError) {
      throw new Error("Could not find any garage to assign you to");
    }
    
    let garageId = null;
    
    if (anyGarage && anyGarage.length > 0) {
      garageId = anyGarage[0].id;
      console.log(`Assigning staff to garage: ${anyGarage[0].name} (${garageId})`);
    } else {
      throw new Error("No garages exist in the system. Please contact an administrator.");
    }
    
    // Update user_roles with garage ID
    const { error: userRoleError } = await supabase
      .from('user_roles')
      .update({ garage_id: garageId })
      .eq('user_id', userId);
      
    if (userRoleError) throw userRoleError;
    
    // Also update the user's profile with the garage ID for consistency
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ garage_id: garageId })
      .eq('id', userId);
      
    if (profileError) {
      console.error("Error updating profile with garage ID:", profileError);
      // Don't throw here - the user_roles update is more important
    }
    
    return garageId;
  };

  return {
    signUp,
    assignRole,
    assignStaffToGarage
  };
};
