
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useGarage } from "@/contexts/GarageContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { userGarages, loading: garageLoading, currentGarage, userGarageRoles } = useGarage();
  const [isReady, setIsReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !garageLoading) {
      console.log("Auth and garage data loaded");
      console.log("User authenticated:", !!user);
      console.log("User garages:", userGarages);
      console.log("Current garage:", currentGarage);
      setIsReady(true);
    }
  }, [authLoading, garageLoading, user, userGarages, currentGarage]);

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // If user is not authenticated, redirect to auth page
  if (!user) {
    console.log("User not authenticated, redirecting to auth");
    // Check if there's a garage in localStorage to preserve the garage context
    const currentGarageId = localStorage.getItem("currentGarageId");
    let redirectPath = "/auth";
    
    // If accessing from a specific garage, redirect to that garage's auth page
    if (currentGarageId && userGarages.length > 0) {
      const garage = userGarages.find(g => g.id === currentGarageId);
      if (garage) {
        console.log(`Redirecting to auth for garage: ${garage.slug}`);
        redirectPath = `/auth?garage=${garage.slug}`;
      }
    }
    
    // Show toast for debugging
    toast.error("Please log in to continue");
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Only check for garages if we're not already on the create-garage route
  // and we're trying to access a protected route
  if (userGarages.length === 0 && 
      !location.pathname.includes('/create-garage') && 
      !location.pathname.includes('/auth')) {
    console.log("User has no garages, redirecting to create-garage");
    toast.info("Please create a garage first");
    return <Navigate to="/create-garage" replace />;
  }
  
  // If the user is authenticated but no current garage is selected,
  // redirect to auth page to select a garage
  if (userGarages.length > 0 && !currentGarage && 
      !location.pathname.includes('/create-garage') && 
      !location.pathname.includes('/auth')) {
    console.log("No current garage selected, redirecting to auth");
    toast.info("Please select a garage");
    return <Navigate to="/auth" replace />;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};
