
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isVerifyingGarage, setIsVerifyingGarage] = useState(true);
  const [hasGarageAccess, setHasGarageAccess] = useState(false);

  useEffect(() => {
    const verifyGarageAccess = async () => {
      if (user) {
        try {
          // Check if user belongs to any garage
          const { data, error } = await supabase
            .from('garage_members')
            .select('garage_id')
            .eq('user_id', user.id);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            setHasGarageAccess(true);
          } else {
            // User doesn't belong to any garage
            toast.error("You don't have access to any garage. Please contact an administrator.");
            // Sign out the user
            await supabase.auth.signOut();
          }
        } catch (error: any) {
          console.error("Error verifying garage access:", error.message);
          // On error, we'll assume no access and sign out
          await supabase.auth.signOut();
        } finally {
          setIsVerifyingGarage(false);
        }
      } else {
        setIsVerifyingGarage(false);
      }
    };

    if (!loading && user) {
      verifyGarageAccess();
    } else {
      setIsVerifyingGarage(false);
    }
  }, [user, loading]);

  if (loading || isVerifyingGarage) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!hasGarageAccess && user) {
    // This case should be handled by the useEffect, but just in case
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
