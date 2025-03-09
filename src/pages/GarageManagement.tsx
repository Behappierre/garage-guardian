
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GarageManager } from "@/components/garage/GarageManager";

const GarageManagement = () => {
  const navigate = useNavigate();
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    // Prevent multiple checks
    if (hasVerified) return;
    
    const checkAdminStatus = async () => {
      try {
        setIsVerifyingAdmin(true);
        
        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
          console.log("No authenticated user found, redirecting to auth");
          navigate("/auth?type=owner");
          return;
        }

        console.log("Checking admin status for user:", userData.user.id);

        // Check if user is an owner in garage_members - this is our primary check
        const { data: ownerData, error: ownerError } = await supabase
          .from('garage_members')
          .select('role')
          .eq('user_id', userData.user.id)
          .eq('role', 'owner');
          
        if (ownerError) {
          console.error("Error checking owner status:", ownerError);
        }

        // Check if user has administrator role in user_roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .eq('role', 'administrator');
        
        if (roleError) {
          console.error("Error checking admin role:", roleError);
          toast.error("Error verifying your permissions");
          navigate("/auth?type=owner");
          return;
        }

        // If user is either an owner in garage_members OR has administrator role in user_roles, allow access
        const isOwner = ownerData && ownerData.length > 0;
        const hasAdminRole = roleData && roleData.length > 0;

        console.log("Access check results:", {
          isOwnerInGarageMembers: isOwner,
          isAdminInUserRoles: hasAdminRole
        });

        if (!hasAdminRole && !isOwner) {
          console.log("User is not an administrator or owner, redirecting to staff login");
          toast.error("Only administrators and owners can access garage management");
          
          // Sign out before redirecting
          await supabase.auth.signOut();
          navigate("/auth");
          return;
        }

        // User is either an administrator or owner, allow access to garage management
        setIsAdmin(true);
      } catch (error) {
        console.error("Error in admin check:", error);
        toast.error("Error verifying your account");
        navigate("/auth?type=owner");
      } finally {
        setIsVerifyingAdmin(false);
        setHasVerified(true);
      }
    };

    checkAdminStatus();
  }, [navigate, hasVerified]);

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

  // Render garage management if user is admin or owner
  return <GarageManager />;
};

export default GarageManagement;
