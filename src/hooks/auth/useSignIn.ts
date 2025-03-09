
import { supabase } from "@/integrations/supabase/client";
import { handleOwnerSignIn } from "@/utils/auth/ownerHandling";
import { handleStaffSignIn } from "@/utils/auth/staffHandling";
import { isAdministrator } from "@/utils/auth/roleVerification";
import { toast } from "sonner";

export const useSignIn = () => {
  const signIn = async (email: string, password: string, userType: "owner" | "staff") => {
    console.log(`Attempting to sign in user ${email} as ${userType} type`);
    
    try {
      // Directly attempt to sign in the user
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Sign-in error:", error.message);
        throw error;
      }
      
      // Ensure profile exists for the successfully authenticated user
      if (signInData.user) {
        await ensureUserProfileExists(signInData.user);
      }
      
      return signInData;
    } catch (error) {
      console.error("Error in sign in process:", error);
      throw error;
    }
  };

  // Helper function to ensure the user profile exists
  const ensureUserProfileExists = async (user: any) => {
    console.log("Ensuring profile exists for user:", user.id);
    
    // Check if profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, garage_id')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profileData) {
      console.log("Profile not found, creating one now");
      // Extract user metadata
      const firstName = user.user_metadata?.first_name || '';
      const lastName = user.user_metadata?.last_name || '';
      
      // Create profile if missing
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          first_name: firstName,
          last_name: lastName
        });
        
      if (createProfileError) {
        console.error("Error creating profile:", createProfileError);
        toast.error("Error creating user profile");
      } else {
        console.log("Created missing profile during login");
      }
    } else {
      console.log("User profile exists:", profileData);
      
      // If user has no garage ID in profile but owns garages, update profile
      if (!profileData.garage_id) {
        const { data: ownedGarages } = await supabase
          .from('garages')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1);
          
        if (ownedGarages && ownedGarages.length > 0) {
          console.log("Found owner's garage, updating profile:", ownedGarages[0].id);
          
          await supabase
            .from('profiles')
            .update({ garage_id: ownedGarages[0].id })
            .eq('id', user.id);
        }
      }
    }
  };

  const verifyUserAccess = async (userId: string, userType: "owner" | "staff") => {
    console.log(`Verifying user access for ${userId} as ${userType}`);
    
    // Select all roles for the user
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
    handleStaffSignIn,
    ensureUserProfileExists
  };
};
