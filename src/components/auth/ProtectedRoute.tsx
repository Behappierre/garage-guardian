
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isVerifyingRole, setIsVerifyingRole] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);

  useEffect(() => {
    // Only verify access once per render and when user is loaded
    if (hasAttemptedVerification || loading) return;
    
    const verifyAccess = async () => {
      if (user) {
        try {
          console.log("Verifying access for user:", user.id);
          setIsVerifyingRole(true);
          
          // Check user role
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (roleError) {
            console.error("Error fetching user role:", roleError.message);
            toast.error("Could not verify your account role");
            setIsVerifyingRole(false);
            setHasAccess(false);
            setHasAttemptedVerification(true);
            return;
          }

          setUserRole(roleData?.role || null);
          console.log("User role:", roleData?.role);
          
          // For garage management, only allow administrators
          if (location.pathname.includes('/garage-management')) {
            if (roleData?.role !== 'administrator') {
              console.log("User is not an administrator, blocking access to garage management");
              toast.error("You don't have permission to access garage management");
              setHasAccess(false);
              setIsVerifyingRole(false);
              setHasAttemptedVerification(true);
              return;
            }
          }
          
          // For dashboard, check if role is valid
          if (location.pathname.includes('/dashboard')) {
            if (!['administrator', 'technician', 'front_desk'].includes(roleData?.role || '')) {
              console.log("User has invalid role for dashboard:", roleData?.role);
              toast.error("You don't have permission to access this area");
              setHasAccess(false);
              setIsVerifyingRole(false);
              setHasAttemptedVerification(true);
              return;
            }
            
            // Check if user has a garage membership
            try {
              const { data: memberData, error: memberError } = await supabase
                .from('garage_members')
                .select('id')
                .eq('user_id', user.id)
                .limit(1);
                
              if (memberError) {
                console.error("Error checking garage membership:", memberError.message);
                toast.error("Error verifying your garage access");
                setHasAccess(false);
                setIsVerifyingRole(false);
                setHasAttemptedVerification(true);
                return;
              }
              
              if (!memberData || memberData.length === 0) {
                console.log("User has no garage memberships");
                toast.error("You don't have access to any garage. Please contact an administrator.");
                setHasAccess(false);
                setIsVerifyingRole(false);
                setHasAttemptedVerification(true);
                return;
              }
            } catch (err) {
              console.error("Exception checking garage membership:", err);
              setHasAccess(false);
              setIsVerifyingRole(false);
              setHasAttemptedVerification(true);
              return;
            }
          }
          
          // If we reach this point, the user has proper access
          setHasAccess(true);
          setIsVerifyingRole(false);
          setHasAttemptedVerification(true);
        } catch (error: any) {
          console.error("Error verifying access:", error.message);
          toast.error("Error verifying your access permissions");
          setHasAccess(false);
          setIsVerifyingRole(false);
          setHasAttemptedVerification(true);
        }
      } else {
        setIsVerifyingRole(false);
        setHasAccess(false);
        setHasAttemptedVerification(true);
      }
    };

    if (!loading) {
      verifyAccess();
    }
  }, [user, loading, location.pathname, hasAttemptedVerification]);

  // Reset verification state when location changes
  useEffect(() => {
    setHasAttemptedVerification(false);
  }, [location.pathname]);

  if (loading || isVerifyingRole) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!hasAccess && user) {
    // Based on the role, redirect to the appropriate page
    if (userRole === 'administrator') {
      return <Navigate to="/garage-management" replace />;
    } else {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};
