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
          setGarageId(ownedGarageId);
          
          await supabase
            .from('garage_members')
            .upsert([{
              user_id: userId,
              garage_id: ownedGarageId,
              role: 'owner'
            }]);
          
          setLoading(false);
          setHasFetchedGarage(true);
          setFetchingGarage(false);
          return;
        }
      }
      
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
        setGarageId(memberGarageId);
        setLoading(false);
        setHasFetchedGarage(true);
        setFetchingGarage(false);
        return;
      }
      
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
        
        const { error: memberError } = await supabase
          .from('garage_members')
          .upsert([
            { user_id: userId, garage_id: defaultGarageId, role: roleData?.role || 'front_desk' }
          ]);
          
        if (memberError) {
          console.error("Error adding user to default garage:", memberError);
        }
      } else {
        console.error("Could not find default garage");
        toast.error("No garage found for your account. Please contact an administrator.");
      }
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
