
import { useState, useEffect } from "react";
import { AuthFormContainer } from "./AuthFormContainer";

interface AuthFormProps {
  userType: "owner" | "staff";
}

export const AuthForm = ({ userType }: AuthFormProps) => {
  // Check if form has been rendered, used to prevent flickering
  const [isFormReady, setIsFormReady] = useState(false);
  
  useEffect(() => {
    // Set form as ready on first render
    setIsFormReady(true);
  }, []);

  if (!isFormReady) {
    return null;
  }

  return <AuthFormContainer userType={userType} />;
};
