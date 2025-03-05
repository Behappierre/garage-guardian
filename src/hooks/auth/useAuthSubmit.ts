import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useToast } from "@/components/ui/use-toast";
import { useSignIn } from "./useSignIn";
import { useSignUp } from "./useSignUp";
import { handleOwnerSignIn } from "@/utils/auth/ownerHandling";
import { handleStaffSignIn } from "@/utils/auth/staffHandling";

type Role = "administrator" | "technician" | "front_desk";
type UserType = "owner" | "staff";
type AuthMode = "signin" | "signup";

export const useAuthSubmit = (userType: UserType) => {
  const [loading, setLoading] = useState(false);
  const [showGarageForm, setShowGarageForm] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  
  const { signIn, verifyUserAccess } = useSignIn();
  const { signUp, assignStaffToGarage } = useSignUp();

  // Clear any stale loading state when component unmounts or user changes
  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, [userType]);

  const handleAuth = async (
    e: React.FormEvent,
    mode: AuthMode,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: Role
  ) => {
    e.preventDefault();
    
    // Check if we're already loading
    if (loading) {
      console.log("Auth submission already in progress, ignoring new request");
      return;
    }
    
    setLoading(true);

    try {
      if (mode === "signup") {
        const user = await signUp(email, password, firstName, lastName, role, userType);
        
        if (user) {
          if (userType === "owner") {
            setNewUserId(user.id);
            setShowGarageForm(true);
            
            await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            uiToast({
              title: "Account created!",
              description: "Now let's set up your garage.",
            });
          } else {
            await assignStaffToGarage(user.id, role);
            
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            if (signInError) throw signInError;
            
            if (role === 'technician') {
              navigate("/dashboard/job-tickets");
            } else {
              navigate("/dashboard/appointments");
            }
          }
        }
      } else {
        // Sign in flow
        console.log(`Attempting to sign in as ${userType} with email: ${email}`);
        
        const signInData = await signIn(email, password, userType);

        if (signInData.user) {
          try {
            const userRole = await verifyUserAccess(signInData.user.id, userType);

            if (userType === "owner") {
              await handleOwnerSignIn(signInData.user.id);
              navigate("/garage-management");
              return;
            }

            if (userType === "staff") {
              if (userRole === 'administrator') {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('garage_id')
                  .eq('id', signInData.user.id)
                  .single();
                
                if (profileData?.garage_id) {
                  console.log("Administrator signing in as staff with garage_id:", profileData.garage_id);
                  navigate("/dashboard");
                  return;
                } else {
                  const { data: ownedGarages } = await supabase
                    .from('garages')
                    .select('id')
                    .eq('owner_id', signInData.user.id)
                    .limit(1);
                  
                  if (ownedGarages && ownedGarages.length > 0) {
                    await supabase
                      .from('profiles')
                      .update({ garage_id: ownedGarages[0].id })
                      .eq('id', signInData.user.id);
                    
                    navigate("/dashboard");
                    return;
                  } else {
                    throw new Error("Administrators should use the garage owner login");
                  }
                }
              } else if (userRole) {
                console.log(`Handling regular staff sign-in for role: ${userRole}`);
                
                try {
                  await handleStaffSignIn(signInData.user.id, userRole);
                  
                  console.log(`Redirecting ${userRole} to appropriate dashboard`);
                  
                  switch (userRole) {
                    case 'technician':
                      navigate("/dashboard/job-tickets");
                      break;
                    case 'front_desk':
                      navigate("/dashboard/appointments");
                      break;
                    default:
                      navigate("/dashboard");
                  }
                  return;
                } catch (staffError: any) {
                  console.error("Error during staff sign-in flow:", staffError.message);
                  uiToast({
                    variant: "destructive",
                    title: "Access Error",
                    description: staffError.message,
                  });
                  await supabase.auth.signOut();
                  setLoading(false);
                  return;
                }
              } else {
                throw new Error("Your account does not have an assigned role");
              }
            }
          } catch (error: any) {
            console.error("Error during sign-in flow:", error.message);
            uiToast({
              variant: "destructive",
              title: "Access Denied",
              description: error.message,
            });
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error.message);
      uiToast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  return {
    loading,
    showGarageForm,
    newUserId,
    setLoading,
    setShowGarageForm,
    setNewUserId,
    handleAuth,
    uiToast
  };
};
