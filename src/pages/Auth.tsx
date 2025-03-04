
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState<"owner" | "staff">("staff");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if we should show owner or staff sign-up/in
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    if (type === "owner") {
      setUserType("owner");
    } else {
      setUserType("staff");
    }

    // Check if user is already authenticated
    const checkAuthAndRole = async () => {
      setIsChecking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log("User already authenticated:", session.user.id);
          
          try {
            // Fetch user role
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (roleError) {
              console.error("Error fetching role:", roleError.message);
              setIsChecking(false);
              return;
            }

            console.log("User role:", roleData?.role);
            console.log("User type:", type);

            // For owner login page, only allow administrators
            if (type === "owner") {
              if (roleData?.role === 'administrator') {
                // Redirect administrators to garage management
                navigate("/garage-management");
                return;
              }
            } else if (roleData?.role === 'administrator') {
              // Administrator on staff login page
              toast.error("Administrators should use the garage owner login");
              // Sign out the user if they're on the wrong login page
              await supabase.auth.signOut();
              setIsChecking(false);
              return;
            } else if (roleData?.role) {
              // Regular staff role, redirect to appropriate page
              switch (roleData.role) {
                case 'technician':
                  navigate("/dashboard/job-tickets");
                  break;
                case 'front_desk':
                  navigate("/dashboard/appointments");
                  break;
                default:
                  navigate("/dashboard");
              }
              return;
            }
            
            // If no role is set yet, stay on the auth page
            setIsChecking(false);
          } catch (error: any) {
            console.error("Error verifying role:", error.message);
            toast.error("Error verifying role: " + error.message);
            // Don't sign out on error, just stay on the auth page
            setIsChecking(false);
          }
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setIsChecking(false);
      }
    };

    checkAuthAndRole();
  }, [navigate, location.search]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
            GarageWizz
          </h1>
          <p className="text-center">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
          GarageWizz
        </h1>
        <AuthForm userType={userType} />
      </div>
    </div>
  );
};

export default Auth;
