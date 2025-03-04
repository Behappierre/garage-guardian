
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GarageManager } from "@/components/garage/GarageManager";

const GarageManagement = () => {
  const navigate = useNavigate();
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
          navigate("/auth?type=owner");
          return;
        }

        // Check if user has administrator role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        
        if (roleError) {
          console.error("Error checking admin status:", roleError);
          toast.error("Error verifying your permissions");
          navigate("/auth?type=owner");
          return;
        }

        // If not an administrator, redirect to staff login
        if (!roleData || roleData.role !== 'administrator') {
          console.log("User is not an administrator, redirecting to staff login");
          toast.error("Only administrators can access garage management");
          
          // Sign out before redirecting
          await supabase.auth.signOut();
          navigate("/auth");
          return;
        }

        // User is an administrator
        setIsAdmin(true);
      } catch (error) {
        console.error("Error in admin check:", error);
        toast.error("Error verifying your account");
        navigate("/auth?type=owner");
      } finally {
        setIsVerifyingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [navigate]);

  // Show loading state while checking admin status
  if (isVerifyingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-t-primary border-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not admin, the useEffect will handle redirecting
  if (!isAdmin) {
    return null;
  }

  // Render garage management if user is admin
  return <GarageManager />;
};

export default GarageManagement;
