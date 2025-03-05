
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useRouteAccess } from "@/hooks/auth/useRouteAccess";
import { AuthLoading } from "./AuthLoading";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { 
    isVerifyingRole, 
    hasAccess, 
    userRole, 
    redirectTo, 
    loading 
  } = useRouteAccess();

  if (loading || isVerifyingRole) {
    return <AuthLoading />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!hasAccess && user) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
    // Based on the role, redirect to the appropriate page
    if (userRole === 'administrator') {
      return <Navigate to="/garage-management" replace />;
    } else {
      return <Navigate to="/auth" replace />;
    }
  }

  return <>{children}</>;
};
