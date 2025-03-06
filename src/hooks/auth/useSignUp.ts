
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

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
    // For owners, ensure the role is always administrator
    const userRole = userType === "owner" ? "administrator" : role;
    
    console.log(`Signing up user with role: ${userRole}, type: ${userType}`);
    
    try {
      // For owner type, garageId MUST be null
      // For staff type, use default garage ID or context garage ID
      const garageId = userType === "owner" ? null : "64960ccf-e353-4b4f-b951-ff687f35c78c"; // Default garage ID for staff
      
      // Call edge function to create user with proper role
      const { data, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          firstName,
          lastName,
          role: userRole,
          garageId,
          userType // Add userType to help determine membership role
        }
      });
      
      if (createUserError) {
        console.error("Error creating user via edge function:", createUserError);
        throw new Error(createUserError.message || "Failed to set up your account. Please try again.");
      }
      
      if (!data || data.status === 'error') {
        console.error("Error response from create-user function:", data);
        throw new Error(data?.error || "Failed to create user account");
      }
      
      console.log("User created successfully:", data);
      
      // Sign in the user automatically after successful creation
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.warn("User created but automatic sign-in failed:", signInError);
        // We don't throw here because user creation was successful
      }
      
      return signInData?.user || { id: data.userId };
    } catch (error) {
      console.error("Error in signup process:", error);
      throw error;
    }
  };

  // These functions are kept for backward compatibility
  const assignRole = async (userId: string, role: string) => {
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
