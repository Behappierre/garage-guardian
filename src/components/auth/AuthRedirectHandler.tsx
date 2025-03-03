
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuthRedirectHandlerProps = {
  effectiveGarageSlug: string | null;
  onCheckingChange: (isChecking: boolean) => void;
};

export const AuthRedirectHandler = ({ 
  effectiveGarageSlug, 
  onCheckingChange 
}: AuthRedirectHandlerProps) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        onCheckingChange(true);
        console.log("Checking auth status...");
        
        // Make sure this completes even if there's no session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // User is not authenticated, just stop checking and render the auth form
          console.log("No active session found");
          onCheckingChange(false);
          return;
        }
        
        console.log("User is authenticated, checking garages...");
        
        // User is authenticated, proceed with redirect logic
        try {
          // First check if the user has any garages
          const { data: garageMembers, error: garageMembersError } = await supabase
            .from('garage_members')
            .select('garage_id, role')
            .eq('user_id', session.user.id);

          if (garageMembersError) {
            console.error("Error fetching garage members:", garageMembersError);
            onCheckingChange(false); // Make sure to stop checking even if there's an error
            toast.error("Error loading garage information");
            return;
          }
          
          console.log("User garages:", garageMembers);
          
          // If user has garages, determine where to redirect
          if (garageMembers && garageMembers.length > 0) {
            // Fetch user role to determine if they're an owner
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();

            if (roleError && roleError.code !== 'PGRST116') { // Not found is ok
              console.error("Error fetching user role:", roleError);
              onCheckingChange(false); // Make sure to stop checking even if there's an error
              toast.error("Error loading user role information");
              return;
            }

            const isAdministrator = roleData?.role === 'administrator';
            console.log(`User is administrator: ${isAdministrator}`);
            
            // Check if we're on a subdomain
            if (effectiveGarageSlug) {
              // If on a specific garage subdomain, proceed to dashboard
              let garageToUse;
              
              // Check if the garage slug matches one of the user's garages
              const { data: garageData, error: garageError } = await supabase
                .from('garages')
                .select('id, name')
                .eq('slug', effectiveGarageSlug)
                .maybeSingle();
              
              if (garageError) {
                console.error("Error fetching garage data:", garageError);
                onCheckingChange(false);
                toast.error("Error loading garage information");
                return;
              } else if (garageData && garageMembers.some(m => m.garage_id === garageData.id)) {
                garageToUse = garageData.id;
                console.log(`Using garage from URL/subdomain: ${garageToUse} (${garageData.name})`);
                
                // Store the current garage ID
                localStorage.setItem("currentGarageId", garageToUse);
                
                // Redirect to dashboard or appropriate page based on role
                const userGarageRole = garageMembers.find(m => m.garage_id === garageToUse)?.role;
                
                if (userGarageRole === 'owner' || userGarageRole === 'admin' || isAdministrator) {
                  console.log("Redirecting to dashboard");
                  toast.success(`Logged in to ${garageData.name}`);
                  navigate("/dashboard");
                } else {
                  // Redirect based on role
                  console.log(`Redirecting based on role: ${roleData?.role}`);
                  switch (roleData?.role) {
                    case 'technician':
                      navigate("/dashboard/job-tickets");
                      break;
                    case 'front_desk':
                      navigate("/dashboard/appointments");
                      break;
                    default:
                      navigate("/dashboard");
                  }
                }
              } else {
                // Garage slug doesn't match user's garages
                console.log("No garage found with that slug");
                onCheckingChange(false);
                // Don't auto-navigate to my-garages here, let the user choose what to do
                // This prevents getting stuck in redirect loops
                return;
              }
            } else {
              // If on main domain and user is an administrator, go to My Garages
              if (isAdministrator) {
                console.log("User is administrator, redirecting to my garages");
                navigate("/my-garages");
              } else {
                // Non-admin staff should be redirected to appropriate dashboard
                // Use first garage for now
                const garageToUse = garageMembers[0].garage_id;
                console.log(`Using first garage: ${garageToUse}`);
                localStorage.setItem("currentGarageId", garageToUse);
                
                switch (roleData?.role) {
                  case 'technician':
                    navigate("/dashboard/job-tickets");
                    break;
                  case 'front_desk':
                    navigate("/dashboard/appointments");
                    break;
                  default:
                    navigate("/dashboard");
                }
              }
            }
          } else {
            // User has no garages, redirect to create garage
            console.log("User has no garages, redirecting to create-garage");
            navigate("/create-garage");
          }
        } catch (error: any) {
          console.error("Error in redirect logic:", error);
          toast.error("Error fetching user information: " + error.message);
          // Ensure we complete the check even if there's an error
          onCheckingChange(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Ensure we complete the check even if there's an error
        onCheckingChange(false);
      }
    };

    checkAuthAndRedirect();

    // The cleanup function that ensures we update the checking state if the component unmounts
    return () => {
      onCheckingChange(false);
    };
  }, [navigate, effectiveGarageSlug, onCheckingChange]);

  return null;
};
