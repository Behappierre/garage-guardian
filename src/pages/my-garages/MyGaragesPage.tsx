
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useGarage } from "@/contexts/GarageContext";
import { getSubdomainInfo } from "@/utils/subdomain";
import { MyGaragesHeader } from "./components/MyGaragesHeader";
import { MyGaragesContent } from "./components/MyGaragesContent";
import { MyGaragesFooter } from "./components/MyGaragesFooter";
import { LoadingState } from "./components/LoadingState";
import { AuthRequiredState } from "./components/AuthRequiredState";
import { NoGaragesState } from "./components/NoGaragesState";
import { supabase } from "@/integrations/supabase/client";

export const MyGaragesPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { userGarages, loading: garageLoading, fetchUserGarages } = useGarage();
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Effect to check if the user is an administrator
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error("Error checking admin status:", error);
          return;
        }
        
        setIsAdmin(roleData?.role === 'administrator');
        console.log("User admin status:", roleData?.role === 'administrator');
      } catch (error) {
        console.error("Error in admin check:", error);
      }
    };
    
    if (user && !authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);
  
  // Effect to handle authentication and fetch garages
  useEffect(() => {
    const initialize = async () => {
      try {
        // Detect if we're on a subdomain
        const { isSubdomain } = getSubdomainInfo();
        setIsSubdomain(isSubdomain);
        
        // If on subdomain, redirect to auth
        if (isSubdomain) {
          console.log("On subdomain, redirecting to auth");
          navigate("/auth");
          return;
        }
        
        // Wait for auth to be checked
        if (authLoading) {
          console.log("Auth still loading");
          return;
        }
        
        // If user is not authenticated, redirect to auth
        if (!user) {
          console.log("No user, redirecting to auth");
          navigate("/auth?isOwnerView=true");
          return;
        }
        
        // At this point we have an authenticated user on the main domain
        
        // If garages data is still loading, wait
        if (garageLoading) {
          console.log("Garage data still loading");
          return;
        }
        
        // Force refresh garage data to ensure we have the latest
        if (!garageLoading) {
          console.log("Explicitly refreshing garage data");
          await fetchUserGarages();
          
          // Set page as loaded
          setPageLoading(false);
        }
      } catch (error) {
        console.error("Error initializing My Garages page:", error);
        setPageLoading(false);
      }
    };
    
    initialize();
  }, [user, authLoading, garageLoading, navigate, isSubdomain, fetchUserGarages]);

  // Show loading state if still processing
  if (pageLoading || authLoading || garageLoading) {
    return <LoadingState />;
  }

  // If we've reached this point but still don't have a user, something went wrong
  if (!user) {
    return <AuthRequiredState onSignIn={() => navigate("/auth?isOwnerView=true")} />;
  }

  // Check if the user should have access to this page
  if (!isAdmin && userGarages.length === 0) {
    return <NoGaragesState onReturnHome={() => navigate("/")} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MyGaragesHeader onSignOut={async () => {
        await supabase.auth.signOut();
        navigate("/");
      }} />
      
      <MyGaragesContent 
        garages={userGarages} 
        onNavigateToCreateGarage={() => navigate("/create-garage")} 
      />
      
      <MyGaragesFooter />
    </div>
  );
};
