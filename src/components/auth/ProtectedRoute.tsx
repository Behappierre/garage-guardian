
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, garageId } = useAuth();
  const location = useLocation();
  const [isVerifyingRole, setIsVerifyingRole] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    // Only verify access once per route change and when user is loaded
    if (hasAttemptedVerification || loading) return;
    
    const verifyAccess = async () => {
      if (!user) {
        setIsVerifyingRole(false);
        setHasAccess(false);
        setHasAttemptedVerification(true);
        return;
      }

      try {
        console.log("Verifying access for user:", user.id);
        setIsVerifyingRole(true);
        
        // Check user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (roleError) {
          console.error("Error fetching user role:", roleError.message);
          toast.error("Could not verify your account role");
          setIsVerifyingRole(false);
          setHasAccess(false);
          setHasAttemptedVerification(true);
          setRedirectTo("/auth");
          return;
        }

        setUserRole(roleData?.role || null);
        console.log("User role:", roleData?.role);
        
        // For garage management, only allow administrators
        if (location.pathname.includes('/garage-management')) {
          if (roleData?.role !== 'administrator') {
            console.log("User is not an administrator, blocking access to garage management");
            toast.error("You don't have permission to access garage management");
            setHasAccess(false);
            setIsVerifyingRole(false);
            setHasAttemptedVerification(true);
            setRedirectTo("/auth");
            return;
          }
          
          // Set hasAccess to true for administrators accessing garage management
          setHasAccess(true);
          setIsVerifyingRole(false);
          setHasAttemptedVerification(true);
          return;
        }
        
        // For dashboard, check if role is valid
        if (location.pathname.includes('/dashboard')) {
          if (!['administrator', 'technician', 'front_desk'].includes(roleData?.role || '')) {
            console.log("User has invalid role for dashboard:", roleData?.role);
            toast.error("You don't have permission to access this area");
            setHasAccess(false);
            setIsVerifyingRole(false);
            setHasAttemptedVerification(true);
            setRedirectTo("/auth");
            return;
          }
          
          // Check if user has a garage_id
          await ensureUserHasGarage(user.id, roleData?.role || 'front_desk');
          
          // If we reach this point, the user has proper access
          setHasAccess(true);
          setIsVerifyingRole(false);
          setHasAttemptedVerification(true);
          setRedirectTo(null);
          return;
        }
        
        // For any other route, allow access to authenticated users
        setHasAccess(true);
        setIsVerifyingRole(false);
        setHasAttemptedVerification(true);
        setRedirectTo(null);
      } catch (error: any) {
        console.error("Error verifying access:", error.message);
        toast.error("Error verifying your access permissions");
        setHasAccess(false);
        setIsVerifyingRole(false);
        setHasAttemptedVerification(true);
        setRedirectTo("/auth");
      }
    };
    
    // Helper function to ensure a user has a garage assigned
    const ensureUserHasGarage = async (userId: string, userRole: string) => {
      // Check if the context already has a garage ID
      if (garageId) {
        console.log("User already has garageId in context:", garageId);
        return;
      }
      
      console.log("Ensuring user has a garage assigned");
      
      // First check profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', userId)
        .single();
        
      if (profileData?.garage_id) {
        console.log("User has garage_id in profile:", profileData.garage_id);
        return;
      }
      
      // If admin, check owned garages first
      if (userRole === 'administrator') {
        const { data: ownedGarages } = await supabase
          .from('garages')
          .select('id')
          .eq('owner_id', userId)
          .limit(1);
          
        if (ownedGarages && ownedGarages.length > 0) {
          console.log("Admin owns garage:", ownedGarages[0].id);
          
          // Update profile with owned garage
          await supabase
            .from('profiles')
            .update({ garage_id: ownedGarages[0].id })
            .eq('id', userId);
            
          return;
        }
      }
      
      // Check if user is a member of any garage
      const { data: memberData } = await supabase
        .from('garage_members')
        .select('garage_id')
        .eq('user_id', userId)
        .limit(1);
        
      if (memberData && memberData.length > 0) {
        console.log("User is a member of garage:", memberData[0].garage_id);
        
        // Update profile with found garage_id
        await supabase
          .from('profiles')
          .update({ garage_id: memberData[0].garage_id })
          .eq('id', userId);
          
        return;
      }
      
      // Try to use default Tractic garage
      const { data: defaultGarage } = await supabase
        .from('garages')
        .select('id')
        .eq('slug', 'tractic')
        .limit(1);
        
      if (defaultGarage && defaultGarage.length > 0) {
        const defaultGarageId = defaultGarage[0].id;
        console.log("Adding user to default Tractic garage:", defaultGarageId);
        
        // Add user as member
        await supabase
          .from('garage_members')
          .upsert([
            { user_id: userId, garage_id: defaultGarageId, role: userRole }
          ]);
          
        // Update profile
        await supabase
          .from('profiles')
          .update({ garage_id: defaultGarageId })
          .eq('id', userId);
          
        return;
      }
      
      // If no default garage, find any available garage
      const { data: anyGarage } = await supabase
        .from('garages')
        .select('id')
        .limit(1);
        
      if (anyGarage && anyGarage.length > 0) {
        console.log("Adding user to available garage:", anyGarage[0].id);
        
        // Add user as member
        await supabase
          .from('garage_members')
          .upsert([
            { user_id: userId, garage_id: anyGarage[0].id, role: userRole }
          ]);
          
        // Update profile
        await supabase
          .from('profiles')
          .update({ garage_id: anyGarage[0].id })
          .eq('id', userId);
      } else {
        console.error("No garages available in the system");
        throw new Error("No garages available in the system");
      }
    };

    if (!loading) {
      verifyAccess();
    }
  }, [user, loading, location.pathname, hasAttemptedVerification, garageId]);

  // Reset verification state when location changes
  useEffect(() => {
    setHasAttemptedVerification(false);
    setRedirectTo(null);
  }, [location.pathname]);

  if (loading || isVerifyingRole) {
    return <div>Loading...</div>;
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
