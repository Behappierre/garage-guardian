
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGarage } from "@/contexts/GarageContext";
import { AuthPageUI } from "@/components/auth/AuthPageUI";
import { AuthRedirectHandler } from "@/components/auth/AuthRedirectHandler";
import { GarageNameFetcher } from "@/components/auth/GarageNameFetcher";
import { getEffectiveGarageSlug, getSubdomainInfo } from "@/utils/subdomain";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const { userGarages } = useGarage();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [garageName, setGarageName] = useState<string | null>(null);
  
  // Get garage slug from URL params
  const garageSlug = searchParams.get('garage');
  
  // Determine which garage slug to use - from URL param or subdomain
  const effectiveGarageSlug = getEffectiveGarageSlug(garageSlug);
  const { isSubdomain } = getSubdomainInfo();

  // Log for debugging
  console.log(`Auth page loaded. Effective garage slug: ${effectiveGarageSlug}`);
  console.log(`Is subdomain: ${isSubdomain}`);
  
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
          isOwnerView={!isSubdomain && !garageSlug}
        />
      )}
    </>
  );
};

export default Auth;
