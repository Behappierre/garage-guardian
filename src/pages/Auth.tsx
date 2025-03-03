
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGarage } from "@/contexts/GarageContext";
import { AuthPageUI } from "@/components/auth/AuthPageUI";
import { AuthRedirectHandler } from "@/components/auth/AuthRedirectHandler";
import { GarageNameFetcher } from "@/components/auth/GarageNameFetcher";
import { getEffectiveGarageSlug } from "@/utils/subdomain";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const { userGarages } = useGarage();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [garageName, setGarageName] = useState<string | null>(null);
  
  // Get garage slug from URL params
  const garageSlug = searchParams.get('garage');
  
  // Determine which garage slug to use - from URL param or subdomain
  const effectiveGarageSlug = getEffectiveGarageSlug(garageSlug);

  // Log for debugging
  console.log(`Auth page loaded. Effective garage slug: ${effectiveGarageSlug}`);
  
  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Checking authentication...</div>;
  }
  
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
      <AuthPageUI
        effectiveGarageSlug={effectiveGarageSlug}
        garageName={garageName}
        userGarages={userGarages}
      />
    </>
  );
};

export default Auth;
