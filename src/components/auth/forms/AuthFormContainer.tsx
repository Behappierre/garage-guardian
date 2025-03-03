
import { useState, useEffect } from "react";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { useSearchParams } from "react-router-dom";

type AuthMode = "signin" | "signup";

interface AuthFormContainerProps {
  garageSlug?: string | null;
  isOwnerView?: boolean;
  initialMode?: string | null;
}

export const AuthFormContainer = ({ 
  garageSlug, 
  isOwnerView = false, 
  initialMode = null 
}: AuthFormContainerProps) => {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode') || initialMode;
  const [mode, setMode] = useState<AuthMode>(modeParam === 'signup' ? 'signup' : 'signin');

  console.log("AuthFormContainer initialized with mode:", mode);
  console.log("Mode parameter:", modeParam);
  console.log("Initial mode:", initialMode);
  console.log("Is owner view:", isOwnerView);
  console.log("Garage slug:", garageSlug);

  // Update mode when URL parameters or initialMode change
  useEffect(() => {
    if (modeParam) {
      const newMode = modeParam === 'signup' ? 'signup' : 'signin';
      console.log(`Setting auth mode to: ${newMode} based on param: ${modeParam}`);
      setMode(newMode);
    }
  }, [modeParam]);

  // Determine the form title based on mode and whether there's a garage
  const getFormTitle = () => {
    if (isOwnerView) {
      return mode === "signin" ? "Garage Owner Sign In" : "Create Owner Account";
    }
    
    if (garageSlug) {
      return mode === "signin" ? "Staff Sign In" : "Create Staff Account";
    }
    
    return mode === "signin" ? "Sign In" : "Create Account";
  };

  const toggleMode = () => {
    const newMode = mode === "signin" ? "signup" : "signin";
    console.log(`Toggling auth mode from ${mode} to ${newMode}`);
    setMode(newMode);
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{getFormTitle()}</h2>
        <p className="mt-2 text-sm text-gray-600">
          {mode === "signin" ? "Welcome back!" : "Join GarageWizz today"}
        </p>
      </div>

      {mode === "signin" ? (
        <SignInForm garageSlug={garageSlug} isOwnerView={isOwnerView} />
      ) : (
        <SignUpForm garageSlug={garageSlug} />
      )}

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={toggleMode}
          className="text-primary hover:underline"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};
