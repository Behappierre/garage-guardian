
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useGarage } from "@/contexts/GarageContext";
import { useEffect, useState } from "react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { userGarages, loading: garageLoading, currentGarage } = useGarage();
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
    return <Navigate to="/auth" state={{ from: location }} replace />;
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
