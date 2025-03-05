
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  isAdministrator, 
  handleAdminWithGarages, 
  handleAdminWithoutGarages,
  handleNonAdminAtOwnerLogin 
} from "@/utils/auth/roleVerification";
import {
  handleAdminOnStaffLogin,
  handleStaffLogin
} from "@/utils/auth/staffRedirects";

interface AuthCheckState {
  isChecking: boolean;
  hasCheckedAuth: boolean;
  authError: string | null;
  userType: "owner" | "staff";
}

export function useAuthCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<AuthCheckState>({
    isChecking: true,
    hasCheckedAuth: false,
    authError: null,
    userType: "staff"
  });

  // Process URL parameters to determine user type and errors
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    const error = params.get("error");
    
    setState(prev => ({
      ...prev,
      userType: type === "owner" ? "owner" : "staff",
      authError: error ? decodeURIComponent(error) : null
    }));
  }, [location.search]);

  // Check if user is already authenticated and handle routing
  useEffect(() => {
    // Only check auth once per render
    if (state.hasCheckedAuth) return;
    
    const checkAuthAndRole = async () => {
      setState(prev => ({ ...prev, isChecking: true, hasCheckedAuth: true }));
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setState(prev => ({ ...prev, isChecking: false }));
          return;
        }
        
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
            setState(prev => ({ ...prev, isChecking: false }));
            return;
          }

          console.log("User role:", roleData?.role);
          console.log("User type page:", state.userType);

          // For owner login page, only allow administrators
          if (state.userType === "owner") {
            const isAdmin = await isAdministrator(session.user.id);
            
            if (isAdmin) {
              // Check if admin owns garages
              const hasGarages = await handleAdminWithGarages(session.user.id);
              
              if (hasGarages) {
                navigate("/garage-management");
                return;
              } else {
                // Handle admin without garages
                await handleAdminWithoutGarages(session.user.id);
                navigate("/garage-management");
                return;
              }
            } else {
              // Non-administrator on owner login page
              await handleNonAdminAtOwnerLogin(session.user.id);
              setState(prev => ({ ...prev, isChecking: false }));
              return;
            }
          } else {
            // On staff login page
            if (roleData?.role === 'administrator') {
              const result = await handleAdminOnStaffLogin(session.user.id);
              
              if (result.shouldRedirect && result.path) {
                if (result.path === "/garage-management") {
                  navigate(`${result.path}?source=staff`);
                } else {
                  navigate(result.path);
                }
                return;
              }
              
              setState(prev => ({ ...prev, isChecking: false }));
              return;
            } else if (roleData?.role) {
              // Staff member login flow
              const result = await handleStaffLogin(session.user.id, roleData.role);
              
              if (result.shouldRedirect && result.path) {
                navigate(result.path);
                return;
              }
            }
          }
          
          // If no role is set yet, stay on the auth page
          setState(prev => ({ ...prev, isChecking: false }));
        } catch (error: any) {
          console.error("Error verifying role:", error.message);
          toast.error("Error verifying role: " + error.message);
          // Sign out to allow a clean authentication
          await supabase.auth.signOut();
          setState(prev => ({ ...prev, isChecking: false }));
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setState(prev => ({ ...prev, isChecking: false }));
      }
    };

    checkAuthAndRole();
  }, [navigate, state.userType, state.hasCheckedAuth]);

  return state;
}
