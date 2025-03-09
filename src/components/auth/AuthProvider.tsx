
import { useState, useEffect, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/context/AuthContext";
import { fetchUserGarage } from "@/utils/auth/fetchUserGarage";
import { toast } from "sonner";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [garageId, setGarageId] = useState<string | null>(null);
  const [fetchingGarage, setFetchingGarage] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch and set the user's garage
  const loadGarageId = async (userId: string) => {
    if (!userId || fetchingGarage) return;
    
    setFetchingGarage(true);
    try {
      console.log("Fetching garage ID for user:", userId);
      const fetchedGarageId = await fetchUserGarage(userId, false);
      console.log("Fetched garage ID:", fetchedGarageId);
      
      setGarageId(fetchedGarageId);

      // Also get user's role for routing decisions
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      // Check if owner in garage_members
      const { data: ownerData } = await supabase
        .from('garage_members')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .maybeSingle();

      if (ownerData?.role === 'owner') {
        setUserRole('owner');
      } else if (roleData?.role) {
        setUserRole(roleData.role);
      }
      
    } catch (error) {
      console.error("Error fetching garage ID:", error);
    } finally {
      setFetchingGarage(false);
    }
  };

  const refreshGarageId = async () => {
    if (!user?.id) return;
    
    // Clear current garage ID first
    setGarageId(null);
    // Then fetch a fresh one
    await loadGarageId(user.id);
  };

  useEffect(() => {
    const setupAuth = async () => {
      setLoading(true);
      
      // Get initial session
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        await loadGarageId(initialSession.user.id);
      }
      
      // Set up auth change listener
      const { data: { subscription } } = await supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log("Auth state changed:", event);
          
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (event === 'SIGNED_IN' && newSession?.user) {
            await loadGarageId(newSession.user.id);
          } else if (event === 'SIGNED_OUT') {
            setGarageId(null);
            setUserRole(null);
          }
        }
      );
      
      setLoading(false);
      
      // Clean up subscription
      return () => {
        subscription.unsubscribe();
      };
    };
    
    setupAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, garageId, userRole, refreshGarageId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
