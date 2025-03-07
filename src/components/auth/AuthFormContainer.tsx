
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { GarageFormContainer } from "./GarageFormContainer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuthSubmit } from "@/hooks/auth/useAuthSubmit";
import { supabase } from "@/integrations/supabase/client";

interface AuthFormContainerProps {
  userType: "owner" | "staff";
}

export const AuthFormContainer = ({ userType }: AuthFormContainerProps) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // Set default role based on userType
  const [role, setRole] = useState<"administrator" | "technician" | "front_desk">(
    userType === "owner" ? "administrator" : "front_desk"
  );
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const { 
    loading, 
    showGarageForm, 
    newUserId, 
    lastError,
    handleAuth 
  } = useAuthSubmit(userType);

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
  };

  const navigateToOtherLogin = () => {
    if (userType === "owner") {
      navigate("/auth?type=staff");
    } else {
      navigate("/");
    }
  };

  const handleGarageComplete = (garageId: string) => {
    console.log("Garage created, ID:", garageId);
    
    // Force a session refresh before redirecting
    supabase.auth.refreshSession().then(() => {
      console.log("Session refreshed after garage creation");
      
      // For owner accounts, redirect to garage management
      if (userType === "owner") {
        navigate("/garage-management");
      } else {
        navigate("/dashboard");
      }
    }).catch(error => {
      console.error("Error refreshing session:", error);
      // Fallback to direct navigation
      navigate(userType === "owner" ? "/garage-management" : "/dashboard");
    });
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (error) {
      console.error("Authentication error from URL:", error, errorDescription);
    }
  }, [location]);

  if (showGarageForm && newUserId) {
    return <GarageFormContainer userId={newUserId} userType={userType} onComplete={handleGarageComplete} />;
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">
          {userType === "owner" ? "Garage Owner" : "Staff"} {mode === "signin" ? "Sign In" : "Registration"}
        </h2>
        <p className="text-gray-600 mt-1">
          {mode === "signin" ? "Welcome back!" : "Create your account"}
        </p>
      </div>

      {lastError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{lastError}</AlertDescription>
        </Alert>
      )}

      {mode === "signin" ? (
        <LoginForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          loading={loading}
          onSubmit={(e) => handleAuth(e, mode, email, password, firstName, lastName, role)}
          onToggleMode={toggleMode}
          userType={userType}
          navigateToOtherLogin={navigateToOtherLogin}
        />
      ) : (
        <RegisterForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          role={role}
          setRole={setRole}
          isLoading={loading}
          onSubmit={(e) => handleAuth(e, mode, email, password, firstName, lastName, role)}
          onToggleMode={toggleMode}
          userType={userType}
          navigateToOtherLogin={navigateToOtherLogin}
        />
      )}
    </div>
  );
};
