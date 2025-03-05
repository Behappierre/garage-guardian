import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { 
  verifyUserRole, 
  verifyGarageManagementAccess, 
  verifyDashboardAccess,
  ensureUserHasGarage 
} from "@/utils/auth/accessVerification";

interface RouteAccessState {
  isVerifyingRole: boolean;
  hasAccess: boolean;
  userRole: string | null;
  hasAttemptedVerification: boolean;
  redirectTo: string | null;
}

export function useRouteAccess() {
  const { user, loading, garageId } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<RouteAccessState>({
    isVerifyingRole: true,
    hasAccess: false,
    userRole: null,
    hasAttemptedVerification: false,
    redirectTo: null
  });

  // Reset verification state when location changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      hasAttemptedVerification: false,
      redirectTo: null
    }));
  }, [location.pathname]);

  useEffect(() => {
    // Only verify access once per route change and when user is loaded
    if (state.hasAttemptedVerification || loading) return;
    
    const verifyAccess = async () => {
      if (!user) {
        setState({
          isVerifyingRole: false,
          hasAccess: false,
          userRole: null,
          hasAttemptedVerification: true,
          redirectTo: null
        });
        return;
      }

      try {
        console.log("Verifying access for user:", user.id);
        setState(prev => ({ ...prev, isVerifyingRole: true }));
        
        // Check user role
        const { hasError, role } = await verifyUserRole(user.id);
        
        if (hasError) {
          setState({
            isVerifyingRole: false,
            hasAccess: false,
            userRole: null,
            hasAttemptedVerification: true,
            redirectTo: "/auth"
          });
          return;
        }

        console.log("User role verified:", role);
        setState(prev => ({ ...prev, userRole: role }));
        
        // For garage management, only allow administrators
        if (location.pathname.includes('/garage-management')) {
          const hasAccess = await verifyGarageManagementAccess(user.id, role);
          
          setState({
            isVerifyingRole: false,
            hasAccess,
            userRole: role,
            hasAttemptedVerification: true,
            redirectTo: hasAccess ? null : "/auth"
          });
          return;
        }
        
        // For dashboard, check if role is valid
        if (location.pathname.includes('/dashboard')) {
          const hasValidRole = await verifyDashboardAccess(user.id, role);
          
          if (!hasValidRole) {
            setState({
              isVerifyingRole: false,
              hasAccess: false,
              userRole: role,
              hasAttemptedVerification: true,
              redirectTo: "/auth"
            });
            return;
          }
          
          // If user has a role and the garageId is already set, give access directly
          if (role && garageId) {
            setState({
              isVerifyingRole: false,
              hasAccess: true,
              userRole: role,
              hasAttemptedVerification: true,
              redirectTo: null
            });
            return;
          }
          
          // Otherwise check if user has a garage_id
          const hasGarage = await ensureUserHasGarage(user.id, role || 'front_desk');
          
          setState({
            isVerifyingRole: false,
            hasAccess: hasGarage,
            userRole: role,
            hasAttemptedVerification: true,
            redirectTo: hasGarage ? null : "/garage-management"
          });
          return;
        }
        
        // For any other route, allow access to authenticated users
        setState({
          isVerifyingRole: false,
          hasAccess: true,
          userRole: role,
          hasAttemptedVerification: true,
          redirectTo: null
        });
      } catch (error: any) {
        console.error("Error verifying access:", error.message);
        setState({
          isVerifyingRole: false,
          hasAccess: false,
          userRole: null,
          hasAttemptedVerification: true,
          redirectTo: "/auth"
        });
      }
    };

    if (!loading) {
      verifyAccess();
    }
  }, [user, loading, location.pathname, state.hasAttemptedVerification, garageId]);

  return {
    ...state,
    loading
  };
}
