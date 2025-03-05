
import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  garageId: string | null;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  garageId: null,
  refreshAuth: async () => {}
});

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [garageId, setGarageId] = useState<string | null>(null);

  // Function to refresh auth state - can be called after changing garages
  const refreshAuth = async () => {
    try {
      setLoading(true);
      // Get latest session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (sessionData?.session?.user) {
        setUser(sessionData.session.user);
        
        // Get the user's garage_id from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('garage_id')
          .eq('id', sessionData.session.user.id)
          .single();
          
        if (profileData?.garage_id) {
          setGarageId(profileData.garage_id);
        }
      } else {
        setUser(null);
        setGarageId(null);
      }
    } catch (error) {
      console.error("Error refreshing auth:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial auth check
    refreshAuth();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          setUser(session.user);
          
          // Get the user's garage_id from profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('garage_id')
            .eq('id', session.user.id)
            .single();
            
          if (profileData?.garage_id) {
            setGarageId(profileData.garage_id);
          }
        }
      }
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setGarageId(null);
      }
      
      setLoading(false);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    garageId,
    refreshAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
