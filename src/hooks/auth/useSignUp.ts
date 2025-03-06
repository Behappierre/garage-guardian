
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
      // We'll use the create-user edge function instead of direct DB operations
      // This will bypass RLS issues for new user registration
      const { error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          firstName,
          lastName,
          role: userRole,
          // Pass a default garage ID for staff users or null for owner users
          garageId: userType === "owner" ? null : "64960ccf-e353-4b4f-b951-ff687f35c78c"
        }
      });
      
      if (createUserError) {
        console.error("Error creating user via edge function:", createUserError);
        throw new Error("Failed to set up your account. Please try again.");
      }
      
      return signUpData.user;
    }
    
    return null;
  };

  const assignRole = async (userId: string, role: string) => {
    // This function is kept for backward compatibility but not used directly
    console.log('Legacy assignRole called but not used');
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
    
    return garageId;
  };

  return {
    signUp,
    assignRole,
    assignStaffToGarage
  };
};
