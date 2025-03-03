
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [garageName, setGarageName] = useState<string | null>(null);
  
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        setIsCheckingAuth(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // User is not authenticated, just stop checking and render the auth form
          setIsCheckingAuth(false);
          return;
        }
        
        // User is authenticated, proceed with normal redirect logic
        try {
          // First check if the user has any garages
          const { data: garageMembers, error: garageMembersError } = await supabase
            .from('garage_members')
            .select('garage_id, role')
            .eq('user_id', session.user.id);

          if (garageMembersError) throw garageMembersError;
          
          // If user has garages, redirect to dashboard
          if (garageMembers && garageMembers.length > 0) {
            // Check if there's a stored current garage
            const storedGarageId = localStorage.getItem("currentGarageId");
            
            // If there's a stored garage ID that matches one of the user's garages, use it
            // Otherwise use the first garage
            const garageToUse = storedGarageId && 
              garageMembers.some(m => m.garage_id === storedGarageId) ? 
              storedGarageId : garageMembers[0].garage_id;
            
            // Store the current garage ID
            localStorage.setItem("currentGarageId", garageToUse);
            
            // Redirect based on role
            // Check if user is an administrator/owner of the garage
            const isOwnerOrAdmin = garageMembers.some(m => 
              m.garage_id === garageToUse && 
              (m.role === 'owner' || m.role === 'admin')
            );
            
            if (isOwnerOrAdmin) {
              navigate("/dashboard");
            } else {
              // Fetch app-wide role
              const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();

              if (roleError) throw roleError;

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
            navigate("/create-garage");
          }
        } catch (error: any) {
          toast.error("Error fetching user information: " + error.message);
          // Default to dashboard if role fetch fails
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsCheckingAuth(false);
      }
    };

    // Get garage information from URL params if available
    const params = new URLSearchParams(location.search);
    const garageSlug = params.get('garage');
    
    // If a garage slug is provided, fetch the garage name
    if (garageSlug) {
      const fetchGarageName = async () => {
        try {
          const { data, error } = await supabase
            .from('garages')
            .select('name')
            .eq('slug', garageSlug)
            .single();
          
          if (error) throw error;
          if (data) {
            setGarageName(data.name);
          }
        } catch (error) {
          console.error("Error fetching garage info:", error);
        }
      };
      
      fetchGarageName();
    }

    checkAuthAndRedirect();
  }, [navigate, location]);

  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Checking authentication...</div>;
  }

  // Get garage information from URL params if available
  const params = new URLSearchParams(location.search);
  const garageSlug = params.get('garage');
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
          GarageWizz
        </h1>
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
      </div>
    </div>
  );
};

export default Auth;
