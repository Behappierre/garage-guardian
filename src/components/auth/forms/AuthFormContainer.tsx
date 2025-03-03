
import { useState } from "react";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";

type AuthMode = "signin" | "signup";

interface AuthFormContainerProps {
  garageSlug?: string | null;
}

export const AuthFormContainer = ({ garageSlug }: AuthFormContainerProps) => {
  const [mode, setMode] = useState<AuthMode>("signin");

  // Determine the form title based on mode and whether there's a garage
  const getFormTitle = () => {
    if (garageSlug) {
      return mode === "signin" ? "Sign In to Your Garage" : "Create Garage Account";
    }
    return mode === "signin" ? "Garage Owner Sign In" : "Create Owner Account";
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
        <SignInForm garageSlug={garageSlug} />
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
