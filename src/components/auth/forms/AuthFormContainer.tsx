
import { useState, useEffect } from "react";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { useSearchParams } from "react-router-dom";

type AuthMode = "signin" | "signup";

interface AuthFormContainerProps {
  garageSlug?: string | null;
  isOwnerView?: boolean;
}

export const AuthFormContainer = ({ garageSlug, isOwnerView = false }: AuthFormContainerProps) => {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const [mode, setMode] = useState<AuthMode>(modeParam === 'signup' ? 'signup' : 'signin');

  // Update mode when URL parameters change
  useEffect(() => {
    setMode(modeParam === 'signup' ? 'signup' : 'signin');
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
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
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
