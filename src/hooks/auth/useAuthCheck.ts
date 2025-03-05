
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
import { getAccessibleGarages } from "@/utils/auth/garageAccess";

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
    // Don't check auth again if we've already done it
    if (state.hasCheckedAuth) return;
    
    const checkAuthAndRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // If no session, just mark as not checking and return early
        if (!session?.user) {
          console.log("No active session found, allowing auth page access");
          setState(prev => ({ 
            ...prev, 
            isChecking: false,
            hasCheckedAuth: true
          }));
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
            setState(prev => ({ 
              ...prev, 
              isChecking: false,
              hasCheckedAuth: true
            }));
            return;
          }

          console.log("User role:", roleData?.role);
          console.log("User type page:", state.userType);

          // For owner login page, only allow administrators
          if (state.userType === "owner") {
            const isAdmin = await isAdministrator(session.user.id);
            
            if (isAdmin) {
              // Check for accessible garages
              const accessibleGarages = await getAccessibleGarages(session.user.id);
              console.log("Admin accessible garages:", accessibleGarages.length);
              
              // If multiple garages, send to garage selection page
              if (accessibleGarages.length > 1) {
                navigate("/garage-management");
                return;
              } else if (accessibleGarages.length === 1) {
                // If only one garage, update the user's profile and role with that garage
                const garageId = accessibleGarages[0].id;
                
                // Update user_roles with this garage_id
                await supabase
                  .from('user_roles')
                  .update({ garage_id: garageId })
                  .eq('user_id', session.user.id);
                  
                // Update profile with this garage_id
                await supabase
                  .from('profiles')
                  .update({ garage_id: garageId })
                  .eq('id', session.user.id);
                  
                navigate("/dashboard");
                return;
              } else {
                // No garages yet - redirect to garage creation
                await handleAdminWithoutGarages(session.user.id);
                navigate("/garage-management");
                return;
              }
            } else {
              // Non-administrator on owner login page
              await handleNonAdminAtOwnerLogin(session.user.id);
              setState(prev => ({ 
                ...prev, 
                isChecking: false,
                hasCheckedAuth: true
              }));
              return;
            }
          } else {
            // On staff login page
            if (roleData?.role === 'administrator') {
              // Use the modified handler for staff login as admin
              const accessibleGarages = await getAccessibleGarages(session.user.id);
              
              if (accessibleGarages.length > 1) {
                // If multiple garages, redirect to garage selection with staff source param
                navigate("/garage-management?source=staff");
                return;
              } else {
                // Otherwise, use existing staff redirect logic
                const result = await handleAdminOnStaffLogin(session.user.id);
                
                if (result.shouldRedirect && result.path) {
                  navigate(result.path);
                  return;
                }
              }
              
              setState(prev => ({ 
                ...prev, 
                isChecking: false,
                hasCheckedAuth: true
              }));
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
          setState(prev => ({ 
            ...prev, 
            isChecking: false,
            hasCheckedAuth: true
          }));
        } catch (error: any) {
          console.error("Error verifying role:", error.message);
          toast.error("Error verifying role: " + error.message);
          // Sign out to allow a clean authentication
          await supabase.auth.signOut();
          setState(prev => ({ 
            ...prev, 
            isChecking: false,
            hasCheckedAuth: true
          }));
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setState(prev => ({ 
          ...prev, 
          isChecking: false,
          hasCheckedAuth: true
        }));
      }
    };

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (state.isChecking) {
        console.log("Auth check timeout reached, allowing form to be displayed");
        setState(prev => ({ 
          ...prev, 
          isChecking: false,
          hasCheckedAuth: true
        }));
      }
    }, 3000); // Reduced timeout to 3 seconds for better UX
    
    checkAuthAndRole();
    
    return () => clearTimeout(timeoutId);
  }, [navigate, state.userType, state.hasCheckedAuth]);

  return state;
}
