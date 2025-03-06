
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthForm } from "@/hooks/auth/useAuthForm";
import { useAuthSubmit } from "@/hooks/auth/useAuthSubmit";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { GarageFormContainer } from "./GarageFormContainer";

interface AuthFormContainerProps {
  userType: "owner" | "staff";
}

export const AuthFormContainer = ({ userType }: AuthFormContainerProps) => {
  const navigate = useNavigate();
  const {
    mode, email, password, firstName, lastName, role,
    setEmail, setPassword, setFirstName, setLastName, setRole,
    toggleMode
  } = useAuthForm(userType);
  
  const {
    loading, showGarageForm, newUserId, handleAuth, setShowGarageForm
  } = useAuthSubmit(userType);

  const handleGarageCreationComplete = (garageId: string) => {
    navigate("/garage-management");
  };

  const navigateToOtherLogin = () => {
    // Always navigate to home page
    navigate("/");
  };

  // Modified to match the expected type in RegisterForm
  const handleSubmit = (e: React.FormEvent) => {
    handleAuth(e, mode, email, password, firstName, lastName, role);
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
        <GarageFormContainer 
          userId={newUserId} 
          onComplete={handleGarageCreationComplete} 
        />
      ) : mode === "signin" ? (
        <LoginForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          loading={loading}
          onSubmit={handleSubmit}
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
          isLoading={loading}
          onSubmit={handleSubmit}
          navigateToOtherLogin={navigateToOtherLogin}
        />
      )}
    </div>
  );
};
