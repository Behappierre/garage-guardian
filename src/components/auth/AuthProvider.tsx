
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";

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
    if (fetchingGarage || hasFetchedGarage) return;
    
    try {
      setFetchingGarage(true);
      console.log("Fetching garage for user:", userId);
      
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
      
      // Check user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
        
      console.log("User role data:", roleData);
      
      if (roleError) {
        console.error("Error fetching user role:", roleError);
      }
      
      const isAdmin = roleData?.role === 'administrator';
      console.log("Is user admin:", isAdmin);
      
      if (isAdmin) {
        const { data: ownedGarages, error: ownedError } = await supabase
          .from('garages')
          .select('id')
          .eq('owner_id', userId)
          .limit(1);
        
        console.log("Owned garages for admin:", ownedGarages, "Error:", ownedError);  
          
        if (!ownedError && ownedGarages && ownedGarages.length > 0) {
          const ownedGarageId = ownedGarages[0].id;
          console.log("Found owned garage for admin:", ownedGarageId);
          
          // Update profile with garage_id
          await supabase
            .from('profiles')
            .update({ garage_id: ownedGarageId })
            .eq('id', userId);
          
          // Ensure user is a member of their owned garage
          await supabase
            .from('garage_members')
            .upsert([{
              user_id: userId,
              garage_id: ownedGarageId,
              role: 'owner'
            }]);
          
          setGarageId(ownedGarageId);
          setLoading(false);
          setHasFetchedGarage(true);
          setFetchingGarage(false);
          return;
        }
      }
      
      // Check if user is a member of any garage
      const { data: memberships, error: membershipError } = await supabase
        .from('garage_members')
        .select('garage_id, role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log("Garage memberships:", memberships, "Error:", membershipError);
        
      if (!membershipError && memberships && memberships.length > 0) {
        const memberGarageId = memberships[0].garage_id;
        console.log("Found membership garage:", memberGarageId);
        
        // Update profile with garage_id
        await supabase
          .from('profiles')
          .update({ garage_id: memberGarageId })
          .eq('id', userId);
        
        setGarageId(memberGarageId);
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
          setHasFetchedGarage(false);
          setGarageId(null);
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
