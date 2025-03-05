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
            navigate("/garage-management?source=staff");
            return;
          }
          
          if (userType === 'owner' && !isAdmin) {
            console.log("Non-admin user accessing owner login, redirecting to staff login");
            navigate("/auth?type=staff");
            return;
          }
          
          navigate(isAdmin ? "/garage-management" : "/dashboard");
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
