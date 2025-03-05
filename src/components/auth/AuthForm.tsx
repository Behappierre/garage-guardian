
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthFormContainer } from "./AuthFormContainer";
import { supabase } from "@/integrations/supabase/client";
import { AuthLoading } from "./AuthLoading";

interface AuthFormProps {
  userType: "owner" | "staff";
}

export const AuthForm = ({ userType }: AuthFormProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
          const userId = sessionData.session.user.id;
          console.log("Found existing session for user:", userId);
          
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle();
            
          const isAdmin = roleData?.role === 'administrator';
          
          if (userType === 'staff' && isAdmin) {
            console.log("Admin user accessing staff login, redirecting to garage selection");
            // Force admins to always select a garage when coming from staff login
            await supabase.from('profiles').update({ garage_id: null }).eq('id', userId);
            navigate("/garage-management?source=staff");
            return;
          }
          
          if (userType === 'owner' && !isAdmin) {
            console.log("Non-admin user accessing owner login, redirecting to staff login");
            navigate("/auth?type=staff");
            return;
          }
          
          // For admin on owner login, or staff on staff login
          if (isAdmin) {
            navigate("/garage-management");
          } else {
            // Clear any existing garage selection to force a new selection
            if (roleData?.role === 'administrator') {
              await supabase.from('profiles').update({ garage_id: null }).eq('id', userId);
            }
            navigate("/dashboard");
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkExistingSession();
  }, [userType, navigate]);
  
  if (isChecking) {
    return <AuthLoading />;
  }

  return <AuthFormContainer userType={userType} />;
};
