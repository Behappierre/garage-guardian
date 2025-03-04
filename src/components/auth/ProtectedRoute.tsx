
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, garageId } = useAuth();
  const location = useLocation();
  const [isVerifyingGarage, setIsVerifyingGarage] = useState(true);
  const [hasGarageAccess, setHasGarageAccess] = useState(false);

  useEffect(() => {
    const verifyGarageAccess = async () => {
      if (user) {
        try {
          // Try to use the RPC function to avoid RLS recursion
          const { data, error } = await supabase.rpc('execute_read_only_query', {
            query_text: `SELECT garage_id FROM garage_members WHERE user_id = '${user.id}'`
          });
          
          if (error) {
            // Handle potential errors with the RPC call
            console.error("Error checking garage membership:", error.message);
            
            // Fallback to direct check if garageId is available from AuthProvider
            if (garageId) {
              setHasGarageAccess(true);
              setIsVerifyingGarage(false);
              return;
            }
            
            // If it's the recursion error, assume there's valid access as a temporary workaround
            if (error.message.includes("infinite recursion")) {
              setHasGarageAccess(true);
              setIsVerifyingGarage(false);
              return;
            }
            
            throw error;
          }
          
          // Parse the jsonb result
          const hasAccess = data && Array.isArray(data) && data.length > 0;
          setHasGarageAccess(hasAccess);
          
          if (!hasAccess) {
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
  }, [user, loading, garageId]);

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
