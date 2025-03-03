
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useGarage } from "@/contexts/GarageContext";
import { useEffect, useState } from "react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { userGarages, loading: garageLoading, currentGarage, userGarageRoles } = useGarage();
  const [isReady, setIsReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !garageLoading) {
      setIsReady(true);
    }
  }, [authLoading, garageLoading]);

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // If user is not authenticated, redirect to auth page
  if (!user) {
    // Check if there's a garage in localStorage to preserve the garage context
    const currentGarageId = localStorage.getItem("currentGarageId");
    let redirectPath = "/auth";
    
    // If accessing from a specific garage, redirect to that garage's auth page
    if (currentGarageId && userGarages.length > 0) {
      const garage = userGarages.find(g => g.id === currentGarageId);
      if (garage) {
        redirectPath = `/auth?garage=${garage.slug}`;
      }
    }
    
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Only check for garages if we're not already on the create-garage route
  // and we're trying to access a protected route
  if (userGarages.length === 0 && 
      !location.pathname.includes('/create-garage') && 
      !location.pathname.includes('/auth')) {
    return <Navigate to="/create-garage" replace />;
  }
  
  // If the user is authenticated but no current garage is selected,
  // redirect to auth page to select a garage
  if (userGarages.length > 0 && !currentGarage && 
      !location.pathname.includes('/create-garage') && 
      !location.pathname.includes('/auth')) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
