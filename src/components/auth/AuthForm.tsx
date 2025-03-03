
import { useState, useEffect } from "react";
import { AuthFormContainer } from "./forms/AuthFormContainer";
import { useSearchParams } from "react-router-dom";

interface AuthFormProps {
  garageSlug?: string | null;
  isOwnerView?: boolean;
  initialMode?: string | null;
}

export const AuthForm = ({ garageSlug, isOwnerView = false, initialMode = null }: AuthFormProps) => {
  const [searchParams] = useSearchParams();
  const modeFromURL = searchParams.get('mode');
  const effectiveMode = modeFromURL || initialMode;
  
  console.log("AuthForm rendered with:");
  console.log("- garageSlug:", garageSlug);
  console.log("- isOwnerView:", isOwnerView);
  console.log("- initialMode:", initialMode);
  console.log("- modeFromURL:", modeFromURL);
  console.log("- effectiveMode:", effectiveMode);
  
  return (
    <AuthFormContainer 
      garageSlug={garageSlug} 
      isOwnerView={isOwnerView} 
      initialMode={effectiveMode} 
    />
  );
};
