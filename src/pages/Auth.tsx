
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState<"owner" | "staff">("staff");

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          // Fetch user role
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

          if (roleError) throw roleError;

          console.log("User role:", roleData?.role);
          console.log("User type:", type);

          // For owner login page, only allow administrators
          if (type === "owner") {
            if (roleData?.role !== 'administrator') {
              toast.error("You don't have permission to access the garage owner area");
              await supabase.auth.signOut();
              return;
            }
            
            // If the user is an administrator and is on the owner login page, 
            // always redirect to garage management
            navigate("/garage-management");
            return;
          }

          // For staff login, handle based on role
          if (roleData?.role === 'administrator') {
            navigate("/garage-management");
          } else {
            // For staff roles
            switch (roleData?.role) {
              case 'technician':
                navigate("/dashboard/job-tickets");
                break;
              case 'front_desk':
                navigate("/dashboard/appointments");
                break;
              default:
                // If no matching role is found, redirect to dashboard
                navigate("/dashboard");
            }
          }
        } catch (error: any) {
          toast.error("Error fetching user role: " + error.message);
          // Sign out on error to force re-authentication
          await supabase.auth.signOut();
        }
      }
    };

    checkAuthAndRole();
  }, [navigate, location.search]);

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
