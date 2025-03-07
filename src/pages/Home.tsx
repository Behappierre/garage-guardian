
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check for messages in URL parameters
    const urlParams = new URLSearchParams(location.search);
    const messageParam = urlParams.get('message');
    
    if (messageParam === 'garage-created') {
      setMessage("Your garage has been created successfully! Please sign in to continue.");
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          console.log("User already authenticated, checking role...");
          
          // Check if user is an admin
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.session.user.id)
            .maybeSingle();
            
          const isAdmin = roleData?.role === 'administrator';
          
          // Redirect to appropriate page
          if (isAdmin) {
            navigate('/garage-management');
          } else {
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [navigate, location.search]);

  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-6">GarageWizz</h1>
          
          {message && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="text-green-700">
                {message}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <Link to="/?type=owner">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Garage Owner Sign In
              </Button>
            </Link>
            
            <Link to="/auth?type=staff">
              <Button variant="outline" className="w-full">
                Staff Sign In
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Welcome to GarageWizz - Streamline your auto repair business
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
