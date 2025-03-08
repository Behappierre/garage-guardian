
import { supabase } from "@/integrations/supabase/client";
import { handleOwnerSignIn } from "@/utils/auth/ownerHandling";
import { handleStaffSignIn } from "@/utils/auth/staffHandling";
import { isAdministrator } from "@/utils/auth/roleVerification";
import { toast } from "sonner";

export const useSignIn = () => {
  const signIn = async (email: string, password: string, userType: "owner" | "staff") => {
    console.log(`Attempting to sign in user ${email} as ${userType} type`);
    
    try {
      // Before signing in, check if user exists
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
        filter: {
          email: email
        }
      });

      // If there was an error checking user, we can still try to sign in
      if (userError) {
        console.log("Error checking user existence, proceeding with login attempt:", userError);
      } else if (userData && userData.users.length === 0) {
        console.error("User does not exist in auth system");
        throw new Error("Invalid login credentials");
      }
      
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Check if profile exists, create if it doesn't
      if (signInData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', signInData.user.id)
          .single();
          
        if (profileError || !profileData) {
          console.log("Profile not found, creating one now");
          // Create profile if missing
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: signInData.user.id,
              first_name: signInData.user.user_metadata?.first_name || '',
              last_name: signInData.user.user_metadata?.last_name || ''
            });
            
          if (createProfileError) {
            console.error("Error creating profile:", createProfileError);
            toast.error("Error creating user profile");
          } else {
            console.log("Created missing profile during login");
          }
        }
      }
      
      return signInData;
    } catch (error) {
      console.error("Error in sign in process:", error);
      throw error;
    }
  };

  const verifyUserAccess = async (userId: string, userType: "owner" | "staff") => {
    console.log(`Verifying user access for ${userId} as ${userType}`);
    
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
      console.error("No roles found for user", userId);
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
