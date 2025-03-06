
import { supabase } from "@/integrations/supabase/client";
import { handleOwnerSignIn } from "@/utils/auth/ownerHandling";
import { handleStaffSignIn } from "@/utils/auth/staffHandling";
import { isAdministrator } from "@/utils/auth/roleVerification";

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
    // Changed to select all roles instead of using maybeSingle
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (roleError) {
      console.error("Error fetching user roles:", roleError.message);
      throw new Error("Could not verify your account role");
    }

    if (!roleData || roleData.length === 0) {
      throw new Error("No role assigned to your account");
    }

    console.log("User roles found:", roleData);
    
    // Check if any role matches the required permission
    if (userType === "owner") {
      const isAdmin = roleData.some(r => r.role === 'administrator');
      if (!isAdmin) {
        throw new Error("You don't have permission to access the garage owner area");
      }
      return 'administrator';
    } else {
      // For staff, return the first appropriate role
      // First check for technician or front_desk roles
      const staffRole = roleData.find(r => ['technician', 'front_desk'].includes(r.role));
      // If no staff roles found but user has administrator role, allow access as administrator
      if (!staffRole && roleData.some(r => r.role === 'administrator')) {
        return 'administrator';
      }
      return staffRole?.role || null;
    }
  };

  return {
    signIn,
    verifyUserAccess,
    handleOwnerSignIn,
    handleStaffSignIn
  };
};
