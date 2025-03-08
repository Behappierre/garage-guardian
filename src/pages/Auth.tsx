
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
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

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
        // Get profile info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) {
          setDebugInfo(`User has no profile: ${profileError.message}`);
          
          // Try to create a profile
          const { error: createError } = await supabase
            .from('profiles')
            .insert({ 
              id: data.user.id,
              first_name: data.user.user_metadata?.first_name || '',
              last_name: data.user.user_metadata?.last_name || ''
            });
            
          if (createError) {
            setDebugInfo((prev) => `${prev}\nFailed to create profile: ${createError.message}`);
          } else {
            setDebugInfo((prev) => `${prev}\nCreated missing profile for user`);
          }
        } else {
          setDebugInfo(`User has profile: ${JSON.stringify(profileData)}`);
          
          // Get user roles
          const { data: rolesData, error: rolesError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', data.user.id);
            
          if (rolesError) {
            setDebugInfo((prev) => `${prev}\nError fetching roles: ${rolesError.message}`);
          } else if (!rolesData || rolesData.length === 0) {
            setDebugInfo((prev) => `${prev}\nUser has no roles assigned`);
          } else {
            setDebugInfo((prev) => `${prev}\nUser roles: ${JSON.stringify(rolesData)}`);
          }
        }
        
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
        
        {debugInfo && (
          <div className="mt-4 p-3 bg-gray-100 text-xs overflow-auto rounded-md whitespace-pre-wrap">
            <h3 className="font-semibold mb-1">Debug Info:</h3>
            {debugInfo}
          </div>
        )}
        
        <div className="mt-6 text-center">
          <button
            onClick={runDiagnostics}
            disabled={isRunningDiagnostics}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isRunningDiagnostics ? "Running diagnostics..." : "Run diagnostics"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
