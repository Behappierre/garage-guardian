
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
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
              navigate("/dashboard");
          }
        } catch (error: any) {
          toast({
            title: "Error fetching user role",
            description: error.message,
            variant: "destructive"
          });
          // Default to dashboard if role fetch fails
          navigate("/dashboard");
        }
      }
    };

    checkAuthAndRole();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
          GarageGuardian
        </h1>
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;
