
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { hasGarageOwnerPermission } from "./utils";

export const useAdminAccessCheck = () => {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setCheckingAccess(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("No authenticated user found, redirecting to auth");
          navigate("/auth?type=owner");
          return;
        }

        // Check if user has administrator/owner permission
        const hasPermission = await hasGarageOwnerPermission(user.id);
        console.log("User has garage owner permission:", hasPermission);
        
        if (!hasPermission) {
          setDebugInfo("User does not have administrator role");
          toast.error("You don't have permission to access the garage management area");
          // Don't sign out automatically, just redirect
          navigate("/auth?type=owner");
          return;
        }
        
        setAccessGranted(true);
        setDebugInfo("Administrator access granted");
      } catch (error) {
        console.error("Error checking admin access:", error);
        setDebugInfo(`Error: ${error}`);
        toast.error("Error checking access permissions");
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [navigate]);

  return { checkingAccess, accessGranted, debugInfo };
};
