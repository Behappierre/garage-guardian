
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const useAdminAccessCheck = () => {
  const navigate = useNavigate();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        console.log("Starting authentication check...");
        setCheckingAccess(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("Error getting user:", userError.message);
          setDebugInfo(`Auth error: ${userError.message}`);
          throw userError;
        }
        
        if (!user) {
          console.log("No authenticated user found");
          toast.error("You must be logged in to access this page");
          navigate("/auth?type=owner");
          return;
        }
        
        console.log("Authenticated user:", user.email);
        
        // Detect Tractic users by email
        const isTracticUser = user.email?.toLowerCase().includes("tractic") || 
                             user.email === "olivier@andre.org.uk";
                             
        // For Tractic users, bypass the strict role checking and proceed directly
        if (isTracticUser) {
          console.log("Detected Tractic user, bypassing strict role check for page access");
          setAccessGranted(true);
          setCheckingAccess(false);
          return;
        }
        
        // For non-Tractic users, check if they have administrator role
        try {
          console.log("Checking administrator role for non-Tractic user");
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();
            
          if (roleError) {
            console.error("Error checking admin access:", roleError.message);
            setDebugInfo(`Role check error: ${roleError.message}`);
            throw roleError;
          }
          
          if (roleData?.role !== 'administrator') {
            console.log("User is not an administrator:", roleData?.role);
            toast.error("Only administrators can access garage management");
            navigate("/auth?type=owner");
            return;
          }
          
          console.log("User is an administrator, access granted");
          setAccessGranted(true);
        } catch (error: any) {
          console.error("Error checking admin role:", error.message);
          setDebugInfo(`Role check exception: ${error.message}`);
          
          // If we cannot check the role, and it's a Tractic user, proceed anyway
          if (!isTracticUser) {
            toast.error("Authentication error");
            navigate("/auth?type=owner");
            return;
          }
          setAccessGranted(true);
        }
      } catch (error: any) {
        console.error("Error in overall access check:", error.message);
        setDebugInfo(`Access check error: ${error.message}`);
        toast.error("Authentication error");
        navigate("/auth?type=owner");
      } finally {
        console.log("Completed authentication check");
        setCheckingAccess(false);
      }
    };
    
    checkAdminAccess();
  }, [navigate]);

  return {
    checkingAccess,
    accessGranted,
    debugInfo
  };
};
