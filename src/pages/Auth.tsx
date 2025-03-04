import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthForm } from "@/components/auth/AuthForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState<"owner" | "staff">("staff");
  const [isChecking, setIsChecking] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we should show owner or staff sign-up/in
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    if (type === "owner") {
      setUserType("owner");
    } else {
      setUserType("staff");
    }

    // Check for error messages in the URL params
    const error = params.get("error");
    if (error) {
      setAuthError(decodeURIComponent(error));
    }
  }, [location.search]);

  // Separate useEffect for auth checking to avoid conflicts
  useEffect(() => {
    // Only check auth once per render
    if (hasCheckedAuth) return;
    
    // Check if user is already authenticated
    const checkAuthAndRole = async () => {
      setIsChecking(true);
      setHasCheckedAuth(true); // Set this early to prevent multiple checks
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsChecking(false);
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
            setIsChecking(false);
            return;
          }

          console.log("User role:", roleData?.role);
          console.log("User type page:", userType);

          // For owner login page, only allow administrators
          if (userType === "owner") {
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
              setIsChecking(false);
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
                  setIsChecking(false);
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
          setIsChecking(false);
        } catch (error: any) {
          console.error("Error verifying role:", error.message);
          toast.error("Error verifying role: " + error.message);
          // Sign out to allow a clean authentication
          await supabase.auth.signOut();
          setIsChecking(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setIsChecking(false);
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
  }, [navigate, userType, hasCheckedAuth]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
            GarageWizz
          </h1>
          <div className="text-center">
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
          GarageWizz
        </h1>
        {authError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {authError}
          </div>
        )}
        {isChecking ? (
          <div className="text-center">
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        ) : (
          <AuthForm userType={userType} />
        )}
      </div>
    </div>
  );
};

export default Auth;
