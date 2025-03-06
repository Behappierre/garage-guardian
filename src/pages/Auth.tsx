
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLoading } from "@/components/auth/AuthLoading";
import { useAuthCheck } from "@/hooks/auth/useAuthCheck";
import { runGarageDiagnostics } from "@/utils/auth/garageDiagnostics";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const Auth = () => {
  const { isChecking, authError, userType } = useAuthCheck();
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Listen for auth state errors from localStorage
  useEffect(() => {
    const checkForErrors = () => {
      const authError = localStorage.getItem('auth_last_error');
      if (authError) {
        setLastError(authError);
        // Clear the error after reading it
        localStorage.removeItem('auth_last_error');
      }
    };
    
    // Check immediately on mount
    checkForErrors();
    
    // And set up interval to check regularly (useful for redirects)
    const interval = setInterval(checkForErrors, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const runDiagnostics = async () => {
    try {
      setIsRunningDiagnostics(true);
      setDiagnosticResult(null);
      const { data } = await supabase.auth.getUser();
      
      if (data.user) {
        // Execute the diagnostics but don't test its return value directly in an if statement
        const result = await runGarageDiagnostics(data.user.id);
        // Set the result based on the boolean return value
        setDiagnosticResult(result ? "Diagnostics completed successfully" : "Diagnostics failed");
        console.log("Diagnostics completed for user:", data.user.id);
      } else {
        setDiagnosticResult("No user logged in to run diagnostics");
        console.log("No user logged in to run diagnostics");
      }
    } catch (error) {
      console.error("Error running diagnostics:", error);
      setDiagnosticResult("Error running diagnostics");
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
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        
        {lastError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Issue</AlertTitle>
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        )}
        
        <AuthForm userType={userType} />
        
        {diagnosticResult && (
          <Alert variant={diagnosticResult.includes("failed") || diagnosticResult.includes("Error") ? "destructive" : "default"} className="mt-4">
            <AlertDescription>{diagnosticResult}</AlertDescription>
          </Alert>
        )}
        
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
