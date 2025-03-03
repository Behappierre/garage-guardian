
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useGarage } from "@/contexts/GarageContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthPageUI } from "@/components/auth/AuthPageUI";
import { AuthRedirectHandler } from "@/components/auth/AuthRedirectHandler";
import { GarageNameFetcher } from "@/components/auth/GarageNameFetcher";
import { getEffectiveGarageSlug, getSubdomainInfo } from "@/utils/subdomain";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const { userGarages } = useGarage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [garageName, setGarageName] = useState<string | null>(null);
  
  // Get garage slug, isOwnerView and mode from URL params
  const garageSlug = searchParams.get('garage');
  const isOwnerViewParam = searchParams.get('isOwnerView');
  const mode = searchParams.get('mode');
  
  // Determine which garage slug to use - from URL param or subdomain
  const effectiveGarageSlug = getEffectiveGarageSlug(garageSlug);
  const { isSubdomain } = getSubdomainInfo();
  
  // Determine if we're in owner view mode
  const isOwnerView = isOwnerViewParam === 'true' || (!isSubdomain && !garageSlug);

  // Log for debugging
  console.log(`Auth page loaded. Effective garage slug: ${effectiveGarageSlug}`);
  console.log(`Is subdomain: ${isSubdomain}`);
  console.log(`Is owner view: ${isOwnerView}`);
  console.log(`Auth mode: ${mode}`);
  
  // If on the main domain and user is already authenticated, check if they should be redirected
  useEffect(() => {
    const checkMainDomainRedirect = async () => {
      if (!isSubdomain && !garageSlug && user && !isCheckingAuth) {
        console.log("User is authenticated on main domain, checking if they should be redirected");
        
        // Check if user is an administrator
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (roleData?.role === 'administrator') {
          console.log("User is administrator, redirecting to my-garages");
          navigate("/my-garages");
        }
      }
    };
    
    checkMainDomainRedirect();
  }, [user, isCheckingAuth, isSubdomain, garageSlug, navigate]);
  
  return (
    <>
      <AuthRedirectHandler
        effectiveGarageSlug={effectiveGarageSlug}
        onCheckingChange={setIsCheckingAuth}
      />
      <GarageNameFetcher
        effectiveGarageSlug={effectiveGarageSlug}
        onGarageNameChange={setGarageName}
      />
      {isCheckingAuth ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      ) : (
        <AuthPageUI
          effectiveGarageSlug={effectiveGarageSlug}
          garageName={garageName}
          userGarages={userGarages}
          isOwnerView={isOwnerView}
          initialMode={mode} // Pass the mode from URL params to AuthPageUI
        />
      )}
    </>
  );
};

export default Auth;
