
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
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const { garageId } = useAuth();
  
  const { signIn, verifyUserAccess } = useSignIn();
  const { signUp, assignStaffToGarage } = useSignUp();

  // This function is now properly typed to return void
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
    setLoading(true);

    (async () => {
      try {
        if (mode === "signup") {
          const user = await signUp(email, password, firstName, lastName, role, userType);
          
          if (user) {
            if (userType === "owner") {
              setNewUserId(user.id);
              setShowGarageForm(true);
              
              // We no longer need this as the signUp function now handles signin after registration
              // await supabase.auth.signInWithPassword({
              //   email,
              //   password
              // });
              
              uiToast({
                title: "Account created!",
                description: "Now let's set up your garage.",
              });
            } else {
              // For staff users, explicitly use the current garage context if available
              const targetGarageId = garageId || await assignStaffToGarage(user.id, role);
              
              if (targetGarageId) {
                console.log(`Staff user assigned to garage: ${targetGarageId}`);
              } else {
                console.warn("No garage ID available for staff assignment");
              }
              
              // We no longer need this as the signUp function now handles signin after registration
              // const { error: signInError } = await supabase.auth.signInWithPassword({
              //   email,
              //   password
              // });
              
              // if (signInError) throw signInError;
              
              // Navigate based on role
              if (role === 'technician') {
                navigate("/dashboard/job-tickets");
              } else {
                navigate("/dashboard/appointments");
              }
            }
          }
        } else {
          const signInData = await signIn(email, password, userType);

          if (signInData.user) {
            try {
              const userRole = await verifyUserAccess(signInData.user.id, userType);

              if (userType === "owner") {
                await handleOwnerSignIn(signInData.user.id);
                navigate("/garage-management");
                return;
              }

              if (userType === "staff" && userRole === 'administrator') {
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
              }
              
              if (userRole) {
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
              } else {
                throw new Error("Your account does not have an assigned role");
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
    setLoading,
    setShowGarageForm,
    setNewUserId,
    handleAuth,
    uiToast
  };
};
