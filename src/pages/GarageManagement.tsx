
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
          navigate("/auth?type=owner");
          return;
        }

        // Check if user has administrator role in user_roles - Get all matching roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id);
        
        if (roleError) {
          console.error("Error checking admin role:", roleError);
          toast.error("Error verifying your permissions");
          navigate("/auth?type=owner");
          return;
        }

        // Check if user is an owner in garage_members - Get all matching roles
        const { data: ownerData, error: ownerError } = await supabase
          .from('garage_members')
          .select('role')
          .eq('user_id', userData.user.id)
          .eq('role', 'owner');
          
        if (ownerError) {
          console.error("Error checking owner status:", ownerError);
        }

        // Check if user has admin role in any of the results
        const hasAdminRole = roleData?.some(role => role.role === 'administrator');
        const isOwner = ownerData && ownerData.length > 0;

        // If user is neither an administrator in user_roles nor an owner in garage_members, redirect
        if (!hasAdminRole && !isOwner) {
          console.log("User is not an administrator or owner, redirecting to staff login");
          toast.error("Only administrators and owners can access garage management");
          
          // Sign out before redirecting
          await supabase.auth.signOut();
          navigate("/auth");
          return;
        }

        console.log("Access granted to garage management:", {
          isAdminInUserRoles: hasAdminRole,
          isOwnerInGarageMembers: isOwner
        });

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
