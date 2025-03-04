
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

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

  // Use useCallback to memoize the fetchUserGarage function
  const fetchUserGarage = useCallback(async (userId: string) => {
    // Avoid multiple simultaneous fetches and refetches
    if (fetchingGarage || hasFetchedGarage) return;
    
    try {
      setFetchingGarage(true);
      
      // Try to get from profile first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', userId)
        .single();
      
      if (!profileError && profileData?.garage_id) {
        setGarageId(profileData.garage_id);
        setLoading(false);
        setHasFetchedGarage(true);
        return;
      }
      
      // Check if user owns any garages
      const { data: ownedGarages, error: ownedError } = await supabase
        .from('garages')
        .select('id')
        .eq('owner_id', userId)
        .limit(1);
        
      if (!ownedError && ownedGarages && ownedGarages.length > 0) {
        const ownedGarageId = ownedGarages[0].id;
        setGarageId(ownedGarageId);
        
        // Try to update profile with this garage for future use
        await supabase
          .from('profiles')
          .update({ garage_id: ownedGarageId })
          .eq('id', userId);
          
        setLoading(false);
        setHasFetchedGarage(true);
        return;
      }
      
      // As a fallback, check garage memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('garage_members')
        .select('garage_id')
        .eq('user_id', userId)
        .limit(1);
        
      if (!membershipError && memberships && memberships.length > 0) {
        const memberGarageId = memberships[0].garage_id;
        setGarageId(memberGarageId);
        
        // Try to update profile with this garage
        await supabase
          .from('profiles')
          .update({ garage_id: memberGarageId })
          .eq('id', userId);
          
        setLoading(false);
        setHasFetchedGarage(true);
        return;
      }
      
      // If all else fails, use default garage as fallback
      if (!garageId) {
        const { data: defaultGarage } = await supabase
          .from('garages')
          .select('id')
          .eq('slug', 'tractic')
          .limit(1);
          
        if (defaultGarage && defaultGarage.length > 0) {
          const defaultGarageId = defaultGarage[0].id;
          setGarageId(defaultGarageId);
          setHasFetchedGarage(true);
        }
      }
    } catch (error) {
      console.error("Error fetching user garage:", error);
    } finally {
      setFetchingGarage(false);
      setLoading(false);
    }
  }, [garageId, fetchingGarage, hasFetchedGarage]);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // If we have a user, fetch their garage
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
          // Reset this flag when auth state changes
          setHasFetchedGarage(false);
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
