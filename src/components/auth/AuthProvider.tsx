
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  garageId: string | null;
  refreshGarageId: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  garageId: null,
  refreshGarageId: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [garageId, setGarageId] = useState<string | null>(null);
  const [fetchingGarage, setFetchingGarage] = useState(false);

  const fetchUserGarage = useCallback(async (userId: string) => {
    if (fetchingGarage || !userId) return;
    
    try {
      setFetchingGarage(true);
      console.log("Fetching garage for user:", userId);
      
      // First try to get garage from profile
      let foundGarageId = null;
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else if (profileData?.garage_id) {
        console.log("Found garage_id in profile:", profileData.garage_id);
        foundGarageId = profileData.garage_id;
      }
      
      // If not found in profile, check user_roles
      if (!foundGarageId) {
        const { data: userRoleData, error: userRoleError } = await supabase
          .from('user_roles')
          .select('garage_id')
          .eq('user_id', userId)
          .single();
          
        if (userRoleError) {
          console.error("Error fetching user_role:", userRoleError);
        } else if (userRoleData?.garage_id) {
          console.log("Found garage_id in user_roles:", userRoleData.garage_id);
          foundGarageId = userRoleData.garage_id;
          
          // Update profile with this garage_id for consistency
          await supabase
            .from('profiles')
            .update({ garage_id: foundGarageId })
            .eq('id', userId);
        }
      }
      
      // If not found in user_roles, check garage_members
      if (!foundGarageId) {
        const { data: memberData, error: memberError } = await supabase
          .from('garage_members')
          .select('garage_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (memberError) {
          console.error("Error fetching garage_members:", memberError);
        } else if (memberData?.garage_id) {
          console.log("Found garage_id in garage_members:", memberData.garage_id);
          foundGarageId = memberData.garage_id;
          
          // Update profile and user_roles with this garage_id for consistency
          await supabase
            .from('profiles')
            .update({ garage_id: foundGarageId })
            .eq('id', userId);
            
          await supabase
            .from('user_roles')
            .update({ garage_id: foundGarageId })
            .eq('user_id', userId);
        }
      }
      
      if (foundGarageId) {
        setGarageId(foundGarageId);
      } else {
        console.log("No garage found for this user");
        setGarageId(null);
      }
    } catch (error) {
      console.error("Error fetching user garage:", error);
      toast.error("Error finding your garage. Please try again or contact support.");
    } finally {
      setFetchingGarage(false);
      setLoading(false);
    }
  }, [fetchingGarage]);

  const refreshGarageId = useCallback(async () => {
    if (user) {
      await fetchUserGarage(user.id);
    }
  }, [user, fetchUserGarage]);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchUserGarage(session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserGarage(session.user.id);
        } else {
          setGarageId(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserGarage]);

  return (
    <AuthContext.Provider value={{ session, user, loading, garageId, refreshGarageId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
