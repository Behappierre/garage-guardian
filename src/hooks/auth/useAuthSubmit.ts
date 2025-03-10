
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useToast } from "@/components/ui/use-toast";
import { useSignIn } from "./useSignIn";
import { useSignUp } from "./useSignUp";
import { handleOwnerSignIn } from "@/utils/auth/ownerHandling";
import { handleStaffSignIn } from "@/utils/auth/staffHandling";
import { useAuth } from "@/components/auth/AuthProvider";

type Role = "administrator" | "technician" | "front_desk";
type UserType = "owner" | "staff";
type AuthMode = "signin" | "signup";

export const useAuthSubmit = (userType: UserType) => {
  const [loading, setLoading] = useState(false);
  const [showGarageForm, setShowGarageForm] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const { garageId, refreshGarageId } = useAuth();
  
  const { signIn, verifyUserAccess } = useSignIn();
  const { signUp, assignStaffToGarage } = useSignUp();

  const handleAuth = (
    e: React.FormEvent,
    mode: AuthMode,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: Role
  ) => {
    e.preventDefault();
    
    if (loading) {
      console.log("Submission already in progress, ignoring duplicate request");
      return;
    }
    
    setLoading(true);
    setLastError(null);

    (async () => {
      try {
        if (mode === "signup") {
          console.log(`Submitting signup via useAuthSubmit for ${email} as ${userType}`);
          
          const user = await signUp(email, password, firstName, lastName, role, userType);
          
          if (user) {
            if (userType === "owner") {
              setNewUserId(user.id);
              setShowGarageForm(true);
              
              uiToast({
                title: "Account created!",
                description: "Now let's set up your garage.",
              });
              
              // Don't attempt auto sign-in for owner accounts
              // They'll create a garage first, then we'll sign them in
            } else {
              try {
                const signInData = await signIn(email, password, userType);
                
                if (signInData.user) {
                  const targetGarageId = garageId || await assignStaffToGarage(signInData.user.id, role);
                  
                  if (targetGarageId) {
                    console.log(`Staff user assigned to garage: ${targetGarageId}`);
                  } else {
                    console.warn("No garage ID available for staff assignment");
                  }
                  
                  // Refresh the garage ID in context after assignment
                  await refreshGarageId();
                  
                  if (role === 'technician') {
                    navigate("/dashboard/job-tickets");
                  } else {
                    navigate("/dashboard/appointments");
                  }
                }
              } catch (signInError: any) {
                console.error("Failed to sign in after registration:", signInError);
                localStorage.setItem('auth_last_error', `Auto-login failed: ${signInError.message}`);
                setLastError(`Account created but couldn't sign in automatically. Please try signing in manually.`);
              }
            }
          }
        } else {
          try {
            console.log(`Attempting to sign in ${email} as ${userType} with password ${password ? "[PROVIDED]" : "[EMPTY]"}`);
            const signInData = await signIn(email, password, userType);

            if (signInData.user) {
              try {
                console.log(`Successfully signed in, user ID: ${signInData.user.id}`);
                const userRole = await verifyUserAccess(signInData.user.id, userType);
                console.log(`User has role: ${userRole}`);

                if (userType === "owner") {
                  console.log("Processing owner sign-in...");
                  // Always redirect owners to garage management instead of dashboard
                  await handleOwnerSignIn(signInData.user.id);
                  navigate("/garage-management");
                  return;
                }

                if (userType === "staff" && userRole === 'administrator') {
                  console.log("Administrator signing in through staff login...");
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
                    // For staff login where user is admin with no garage selected,
                    // go to garage selection
                    navigate("/garage-management?source=staff");
                    return;
                  }
                }
                
                if (userRole) {
                  console.log(`Processing ${userRole} staff sign-in...`);
                  await handleStaffSignIn(signInData.user.id, userRole);
                  
                  // Refresh garage ID in context after sign-in
                  await refreshGarageId();
                  
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
                } else {
                  console.error("User has no role assigned");
                  throw new Error("Your account does not have an assigned role");
                }
              } catch (error: any) {
                console.error("Error during sign-in flow:", error.message);
                setLastError(error.message);
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
          } catch (error: any) {
            console.error("Sign-in error:", error.message);
            setLastError(error.message);
            uiToast({
              variant: "destructive",
              title: "Login Failed",
              description: error.message || "Invalid login credentials",
            });
            setLoading(false);
            return;
          }
        }
      } catch (error: any) {
        console.error("Authentication error:", error.message);
        setLastError(error.message);
        uiToast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to set up your account. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    })();
  };

  return {
    loading,
    showGarageForm,
    newUserId,
    lastError,
    setLoading,
    setShowGarageForm,
    setNewUserId,
    setLastError,
    handleAuth,
    uiToast
  };
};
