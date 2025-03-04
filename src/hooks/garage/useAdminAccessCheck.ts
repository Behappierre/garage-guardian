
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isAdministrator } from "./utils/userHelpers";

export const useAdminAccessCheck = () => {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
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

        // Use the isAdministrator utility function for consistent role checking
        const isAdmin = await isAdministrator(user.id);
        
        if (!isAdmin) {
          setDebugInfo("User does not have administrator role");
          toast.error("You don't have permission to access the garage management area");
          navigate("/auth?type=owner");
          return;
        }
        
        // At this point we know the user is an administrator
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
