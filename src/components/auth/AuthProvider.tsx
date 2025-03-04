
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
      console.log("Fetching garage for user:", userId);
      
      // Try to get from profile first - explicitly specify table and column
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, garage_id')
        .eq('id', userId)
        .single();
      
      console.log("Profile data:", profileData, "Error:", profileError);
      
      if (!profileError && profileData?.garage_id) {
        console.log("Found garage_id in profile:", profileData.garage_id);
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
      
      console.log("Owned garages:", ownedGarages, "Error:", ownedError);  
        
      if (!ownedError && ownedGarages && ownedGarages.length > 0) {
        const ownedGarageId = ownedGarages[0].id;
        console.log("Found owned garage:", ownedGarageId);
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
      
      console.log("Memberships:", memberships, "Error:", membershipError);
        
      if (!membershipError && memberships && memberships.length > 0) {
        const memberGarageId = memberships[0].garage_id;
        console.log("Found membership garage:", memberGarageId);
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
        console.log("Attempting to use default Tractic garage");
        const { data: defaultGarage, error: defaultError } = await supabase
          .from('garages')
          .select('id')
          .eq('slug', 'tractic')
          .limit(1);
          
        console.log("Default garage:", defaultGarage, "Error:", defaultError);
          
        if (defaultGarage && defaultGarage.length > 0) {
          const defaultGarageId = defaultGarage[0].id;
          console.log("Using default garage:", defaultGarageId);
          setGarageId(defaultGarageId);
          setHasFetchedGarage(true);
        } else {
          console.error("Could not find default garage");
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
