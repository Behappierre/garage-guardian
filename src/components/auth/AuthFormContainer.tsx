
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthForm } from "@/hooks/auth/useAuthForm";
import { useSignIn } from "@/hooks/auth/useSignIn";
import { useSignUp } from "@/hooks/auth/useSignUp";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { GarageForm } from "./GarageForm";

interface AuthFormContainerProps {
  userType: "owner" | "staff";
}

export const AuthFormContainer = ({ userType }: AuthFormContainerProps) => {
  const navigate = useNavigate();
  const {
    mode, loading, email, password, firstName, lastName, role,
    showGarageForm, newUserId, setLoading, setEmail, setPassword,
    setFirstName, setLastName, setRole, setShowGarageForm, 
    setNewUserId, toggleMode, handleGarageCreationComplete, toast
  } = useAuthForm(userType);
  
  const { signIn, verifyUserAccess, handleOwnerSignIn, handleStaffSignIn } = useSignIn();
  const { signUp, assignStaffToGarage } = useSignUp();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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
            
            toast({
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
            toast({
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
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToOtherLogin = () => {
    navigate(userType === "owner" ? "/auth?type=staff" : "/");
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {userType === "owner" 
            ? (mode === "signin" ? "Garage Owner Sign In" : "Create Garage Owner Account") 
            : (mode === "signin" ? "Staff Sign In" : "Create Staff Account")}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {mode === "signin" ? "Welcome back!" : "Join GarageWizz today"}
        </p>
      </div>

      {showGarageForm && newUserId ? (
        <GarageForm userId={newUserId} onComplete={handleGarageCreationComplete} />
      ) : mode === "signin" ? (
        <LoginForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          loading={loading}
          onSubmit={handleAuth}
          onToggleMode={toggleMode}
          userType={userType}
          navigateToOtherLogin={navigateToOtherLogin}
        />
      ) : (
        <RegisterForm
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          role={role}
          setRole={setRole}
          userType={userType}
          loading={loading}
          onSubmit={handleAuth}
          onToggleMode={toggleMode}
          navigateToOtherLogin={navigateToOtherLogin}
        />
      )}
    </div>
  );
};
