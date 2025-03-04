
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
            if (roleData?.role === 'administrator') {
              // Check if admin owns any garages
              const { data: ownedGarages, error: ownedError } = await supabase
                .from('garages')
                .select('id')
                .eq('owner_id', session.user.id)
                .limit(1);
                
              if (ownedError) {
                console.error("Error checking owned garages:", ownedError);
              }
                
              if (ownedGarages && ownedGarages.length > 0) {
                // Admin has garages, redirect to management
                navigate("/garage-management");
                return;
              } else {
                // Admin doesn't own garages yet, ensure they have a garage assigned
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('garage_id')
                  .eq('id', session.user.id)
                  .single();
                  
                if (!profileData?.garage_id) {
                  // Try to find any garage
                  const { data: anyGarage } = await supabase
                    .from('garages')
                    .select('id')
                    .limit(1);
                    
                  if (anyGarage && anyGarage.length > 0) {
                    // Assign the first garage
                    await supabase
                      .from('profiles')
                      .update({ garage_id: anyGarage[0].id })
                      .eq('id', session.user.id);
                  }
                }
                
                // Redirect to garage management to create a garage
                navigate("/garage-management");
                return;
              }
            } else {
              // Non-administrator on owner login page
              toast.error("Only administrators can access the garage owner area");
              await supabase.auth.signOut();
              setState(prev => ({ ...prev, isChecking: false }));
              return;
            }
          } else {
            // On staff login page
            if (roleData?.role === 'administrator') {
              // Administrator on staff login page - check if they have a garage
              const { data: profileData } = await supabase
                .from('profiles')
                .select('garage_id')
                .eq('id', session.user.id)
                .single();
                
              if (profileData?.garage_id) {
                navigate("/dashboard");
                return;
              } else {
                // Try to find owned garages
                const { data: ownedGarages } = await supabase
                  .from('garages')
                  .select('id')
                  .eq('owner_id', session.user.id)
                  .limit(1);
                  
                if (ownedGarages && ownedGarages.length > 0) {
                  // Update profile with owned garage
                  await supabase
                    .from('profiles')
                    .update({ garage_id: ownedGarages[0].id })
                    .eq('id', session.user.id);
                    
                  navigate("/dashboard");
                  return;
                } else {
                  // Sign out and show error
                  toast.error("Administrators should use the garage owner login");
                  await supabase.auth.signOut();
                  setState(prev => ({ ...prev, isChecking: false }));
                  return;
                }
              }
            } else if (roleData?.role) {
              // Staff member - ensure they have a garage
              await ensureUserHasGarage(session.user.id, roleData.role);
              
              // Redirect based on role
              switch (roleData.role) {
                case 'technician':
                  navigate("/dashboard/job-tickets");
                  break;
                case 'front_desk':
                  navigate("/dashboard/appointments");
                  break;
                default:
                  navigate("/dashboard");
              }
              return;
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

    // Helper function to ensure a user has a garage assigned
    const ensureUserHasGarage = async (userId: string, userRole: string) => {
      // First check profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', userId)
        .single();
        
      if (!profileData?.garage_id) {
        // If no garage_id in profile, check memberships
        const { data: memberData } = await supabase
          .from('garage_members')
          .select('garage_id')
          .eq('user_id', userId)
          .limit(1);
          
        if (memberData && memberData.length > 0) {
          // Update profile with found garage_id
          await supabase
            .from('profiles')
            .update({ garage_id: memberData[0].garage_id })
            .eq('id', userId);
        } else {
          // Try to use default Tractic garage
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
                { user_id: userId, garage_id: defaultGarageId, role: userRole }
              ]);
              
            // Update profile
            await supabase
              .from('profiles')
              .update({ garage_id: defaultGarageId })
              .eq('id', userId);
          } else {
            // If no default garage, find any available garage
            const { data: anyGarage } = await supabase
              .from('garages')
              .select('id')
              .limit(1);
              
            if (anyGarage && anyGarage.length > 0) {
              const garageId = anyGarage[0].id;
              
              // Add user as member
              await supabase
                .from('garage_members')
                .upsert([
                  { user_id: userId, garage_id: garageId, role: userRole }
                ]);
                
              // Update profile
              await supabase
                .from('profiles')
                .update({ garage_id: garageId })
                .eq('id', userId);
            }
          }
        }
      }
    };

    checkAuthAndRole();
  }, [navigate, state.userType, state.hasCheckedAuth]);

  return state;
}
