
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, garageId } = useAuth();
  const location = useLocation();
  const [isVerifyingRole, setIsVerifyingRole] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    // Only verify access once per route change and when user is loaded
    if (hasAttemptedVerification || loading) return;
    
    const verifyAccess = async () => {
      if (!user) {
        setIsVerifyingRole(false);
        setHasAccess(false);
        setHasAttemptedVerification(true);
        return;
      }

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
          setRedirectTo("/auth");
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
            setRedirectTo("/auth");
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
            setRedirectTo("/auth");
            return;
          }
          
          // Check if user has a garage_id (either in profile or as a member)
          if (!garageId) {
            // If no garage_id is set in the AuthProvider, try to set one now
            const { data: profileData } = await supabase
              .from('profiles')
              .select('garage_id')
              .eq('id', user.id)
              .single();
              
            if (!profileData?.garage_id) {
              // If no garage_id in profile, check memberships
              const { data: memberData, error: memberError } = await supabase
                .from('garage_members')
                .select('garage_id')
                .eq('user_id', user.id)
                .limit(1);
                
              if (memberError) {
                console.error("Error checking garage membership:", memberError.message);
                toast.error("Error verifying your garage access");
                setHasAccess(false);
                setIsVerifyingRole(false);
                setHasAttemptedVerification(true);
                setRedirectTo("/auth");
                return;
              }
              
              if (!memberData || memberData.length === 0) {
                // Try default garage
                const { data: defaultGarage } = await supabase
                  .from('garages')
                  .select('id')
                  .eq('slug', 'tractic')
                  .limit(1);
                  
                if (defaultGarage && defaultGarage.length > 0) {
                  const defaultGarageId = defaultGarage[0].id;
                  
                  // Add user as member
                  await supabase
                    .from('garage_members')
                    .upsert([
                      { user_id: user.id, garage_id: defaultGarageId, role: roleData?.role || 'front_desk' }
                    ]);
                    
                  // Update profile
                  await supabase
                    .from('profiles')
                    .update({ garage_id: defaultGarageId })
                    .eq('id', user.id);
                } else {
                  console.log("User has no garage memberships and no default garage found");
                  toast.error("You don't have access to any garage. Please contact an administrator.");
                  setHasAccess(false);
                  setIsVerifyingRole(false);
                  setHasAttemptedVerification(true);
                  setRedirectTo("/auth");
                  return;
                }
              }
            }
          }
        }
        
        // If we reach this point, the user has proper access
        setHasAccess(true);
        setIsVerifyingRole(false);
        setHasAttemptedVerification(true);
        setRedirectTo(null);
      } catch (error: any) {
        console.error("Error verifying access:", error.message);
        toast.error("Error verifying your access permissions");
        setHasAccess(false);
        setIsVerifyingRole(false);
        setHasAttemptedVerification(true);
        setRedirectTo("/auth");
      }
    };

    if (!loading) {
      verifyAccess();
    }
  }, [user, loading, location.pathname, hasAttemptedVerification, garageId]);

  // Reset verification state when location changes
  useEffect(() => {
    setHasAttemptedVerification(false);
    setRedirectTo(null);
  }, [location.pathname]);

  if (loading || isVerifyingRole) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!hasAccess && user) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
    // Based on the role, redirect to the appropriate page
    if (userRole === 'administrator') {
      return <Navigate to="/garage-management" replace />;
    } else {
      return <Navigate to="/auth" replace />;
    }
  }

  return <>{children}</>;
};
