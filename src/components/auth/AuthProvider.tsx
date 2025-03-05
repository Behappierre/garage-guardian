import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { getAccessibleGarages, repairUserGarageRelationships } from "@/utils/auth/garageAccess";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  garageId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  garageId: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [garageId, setGarageId] = useState<string | null>(null);
  const [fetchingGarage, setFetchingGarage] = useState(false);
  const [hasFetchedGarage, setHasFetchedGarage] = useState(false);

  const fetchUserGarage = useCallback(async (userId: string) => {
    if (fetchingGarage || hasFetchedGarage || !userId) return;
    
    try {
      setFetchingGarage(true);
      console.log("Fetching garage for user:", userId);
      
      // Try to repair relationships first
      await repairUserGarageRelationships(userId);
      
      // First check if user has a garage in their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', userId)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError);
      }
      
      if (profileData?.garage_id) {
        console.log("Found profile garage_id:", profileData.garage_id);
        setGarageId(profileData.garage_id);
        setLoading(false);
        setHasFetchedGarage(true);
        setFetchingGarage(false);
        return;
      }
      
      // Fetch all accessible garages
      const accessibleGarages = await getAccessibleGarages(userId);
      
      if (accessibleGarages.length > 0) {
        const firstGarage = accessibleGarages[0];
        console.log("Using first accessible garage:", firstGarage.id);
        
        // Update profile with garage_id
        await supabase
          .from('profiles')
          .update({ garage_id: firstGarage.id })
          .eq('id', userId);
        
        setGarageId(firstGarage.id);
        setLoading(false);
        setHasFetchedGarage(true);
        setFetchingGarage(false);
        return;
      }
      
      // No garage found
      console.log("No garage found for this user");
      toast.info("You don't have a garage associated with your account. Please create or join one.");
    } catch (error) {
      console.error("Error fetching user garage:", error);
      toast.error("Error finding your garage. Please try again or contact support.");
    } finally {
      setFetchingGarage(false);
      setLoading(false);
      setHasFetchedGarage(true);
    }
  }, [fetchingGarage, hasFetchedGarage]);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user && !hasFetchedGarage) {
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
          if (!hasFetchedGarage) {
            fetchUserGarage(session.user.id);
          }
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
  }, [fetchUserGarage, hasFetchedGarage]);

  return (
    <AuthContext.Provider value={{ session, user, loading, garageId }}>
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
