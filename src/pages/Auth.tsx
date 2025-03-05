
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLoading } from "@/components/auth/AuthLoading";
import { useAuthCheck } from "@/hooks/auth/useAuthCheck";
import { runGarageDiagnostics } from "@/utils/auth/garageDiagnostics";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const Auth = () => {
  const { isChecking, authError, userType } = useAuthCheck();
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  const runDiagnostics = async () => {
    try {
      setIsRunningDiagnostics(true);
      const { data } = await supabase.auth.getUser();
      
      if (data.user) {
        await runGarageDiagnostics(data.user.id);
        console.log("Diagnostics completed for user:", data.user.id);
      } else {
        console.log("No user logged in to run diagnostics");
      }
    } catch (error) {
      console.error("Error running diagnostics:", error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  if (isChecking) {
    return <AuthLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
          GarageWizz
        </h1>
        {authError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {authError}
          </div>
        )}
        <AuthForm userType={userType} />
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 text-center">
            <button
              onClick={runDiagnostics}
              disabled={isRunningDiagnostics}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {isRunningDiagnostics ? "Running diagnostics..." : "Run garage diagnostics"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
