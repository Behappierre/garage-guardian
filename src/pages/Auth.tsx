
import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [garageName, setGarageName] = useState<string | null>(null);
  
  // Get garage slug from URL params
  const garageSlug = searchParams.get('garage');
  
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        setIsCheckingAuth(true);
        console.log("Checking auth status...");
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // User is not authenticated, just stop checking and render the auth form
          console.log("No active session found");
          setIsCheckingAuth(false);
          return;
        }
        
        console.log("User is authenticated, checking garages...");
        
        // User is authenticated, proceed with normal redirect logic
        try {
          // First check if the user has any garages
          const { data: garageMembers, error: garageMembersError } = await supabase
            .from('garage_members')
            .select('garage_id, role')
            .eq('user_id', session.user.id);

          if (garageMembersError) {
            console.error("Error fetching garage members:", garageMembersError);
            throw garageMembersError;
          }
          
          console.log("User garages:", garageMembers);
          
          // If user has garages, redirect to dashboard
          if (garageMembers && garageMembers.length > 0) {
            // Check if there's a stored current garage or if we should use one from the URL
            let garageToUse;
            
            // If there's a garage slug in the URL and it matches one of the user's garages, use that
            if (garageSlug) {
              const { data: garageData } = await supabase
                .from('garages')
                .select('id')
                .eq('slug', garageSlug)
                .single();
              
              if (garageData && garageMembers.some(m => m.garage_id === garageData.id)) {
                garageToUse = garageData.id;
                console.log(`Using garage from URL: ${garageToUse}`);
              }
            }
            
            // If no garage was selected from URL, try stored garage
            if (!garageToUse) {
              const storedGarageId = localStorage.getItem("currentGarageId");
              if (storedGarageId && garageMembers.some(m => m.garage_id === storedGarageId)) {
                garageToUse = storedGarageId;
                console.log(`Using stored garage: ${garageToUse}`);
              } else {
                // Default to first garage
                garageToUse = garageMembers[0].garage_id;
                console.log(`Using default garage: ${garageToUse}`);
              }
            }
            
            // Store the current garage ID
            localStorage.setItem("currentGarageId", garageToUse);
            
            // Redirect based on role
            // Check if user is an administrator/owner of the garage
            const isOwnerOrAdmin = garageMembers.some(m => 
              m.garage_id === garageToUse && 
              (m.role === 'owner' || m.role === 'admin')
            );
            
            if (isOwnerOrAdmin) {
              console.log("User is owner/admin, redirecting to dashboard");
              navigate("/dashboard");
            } else {
              // Fetch app-wide role
              const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();

              if (roleError) {
                console.error("Error fetching user role:", roleError);
                throw roleError;
              }

              console.log(`User role: ${roleData?.role}, redirecting accordingly`);
              
              // Redirect based on role
              switch (roleData?.role) {
                case 'administrator':
                  navigate("/dashboard");
                  break;
                case 'technician':
                  navigate("/dashboard/job-tickets");
                  break;
                case 'front_desk':
                  navigate("/dashboard/appointments");
                  break;
                default:
                  // If no role is found, redirect to dashboard
                  navigate("/dashboard");
              }
            }
          } else {
            // User has no garages, redirect to create garage
            console.log("User has no garages, redirecting to create-garage");
            navigate("/create-garage");
          }
        } catch (error: any) {
          console.error("Error in redirect logic:", error);
          toast.error("Error fetching user information: " + error.message);
          // Default to dashboard if role fetch fails
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsCheckingAuth(false);
      }
    };

    // If a garage slug is provided, fetch the garage name
    if (garageSlug) {
      const fetchGarageName = async () => {
        try {
          console.log(`Fetching name for garage slug: ${garageSlug}`);
          const { data, error } = await supabase
            .from('garages')
            .select('name')
            .eq('slug', garageSlug)
            .single();
          
          if (error) {
            console.error("Error fetching garage info:", error);
            throw error;
          }
          
          if (data) {
            console.log(`Found garage name: ${data.name}`);
            setGarageName(data.name);
          }
        } catch (error) {
          console.error("Error fetching garage info:", error);
        }
      };
      
      fetchGarageName();
    }

    checkAuthAndRedirect();
  }, [navigate, garageSlug]);

  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Checking authentication...</div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Building className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-center text-3xl font-bold text-gray-900">
            GarageWizz
          </h1>
        </div>
        
        {garageSlug && garageName && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">{garageName}</h2>
            <p className="text-sm text-gray-500">
              Login to access your garage dashboard
            </p>
          </div>
        )}
        
        {!garageSlug && (
          <div className="text-center text-sm text-gray-500 mb-4">
            Garage Owner Login
          </div>
        )}
        
        <AuthForm garageSlug={garageSlug} />
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have a garage yet? {" "}
            <button 
              onClick={() => navigate("/create-garage")}
              className="text-primary font-medium hover:underline"
            >
              Create one here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
