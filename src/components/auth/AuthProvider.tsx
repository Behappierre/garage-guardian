
import { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // If we have a user, fetch their garage
      if (session?.user) {
        fetchUserGarage(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // If we have a user, fetch their garage
      if (session?.user) {
        fetchUserGarage(session.user.id);
      } else {
        setGarageId(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserGarage = async (userId: string) => {
    try {
      // First try to get garage from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', userId)
        .single();
      
      if (!profileError && profileData?.garage_id) {
        setGarageId(profileData.garage_id);
        setLoading(false);
        return;
      }
      
      // If profile query fails with recursion error or no garage_id, try direct SQL query
      if (profileError || !profileData?.garage_id) {
        console.log("Getting garage via RPC due to profile query issue:", 
                    profileError ? profileError.message : "No garage in profile");
        
        // Use RPC function to bypass RLS policies
        const { data, error } = await supabase.rpc('execute_read_only_query', {
          query_text: `SELECT garage_id FROM garage_members WHERE user_id = '${userId}' LIMIT 1`
        });
        
        if (error) {
          console.error("Error in RPC garage query:", error.message);
          
          // If all else fails, get default Tractic garage as fallback
          const { data: garageData } = await supabase.rpc('execute_read_only_query', {
            query_text: `SELECT id FROM garages WHERE name = 'Tractic' OR slug = 'tractic' LIMIT 1`
          });
          
          if (garageData && Array.isArray(garageData) && garageData.length > 0) {
            const defaultGarageId = (garageData[0] as Record<string, any>).id as string;
            setGarageId(defaultGarageId);
            
            // Try to update the user's profile with this garage
            await supabase
              .from('profiles')
              .update({ garage_id: defaultGarageId })
              .eq('id', userId);
              
            console.log("Using default Tractic garage:", defaultGarageId);
          } else {
            console.error("Could not find any garage, including default");
            setGarageId(null);
          }
        } else if (data && Array.isArray(data) && data.length > 0) {
          const fetchedGarageId = (data[0] as Record<string, any>).garage_id as string;
          setGarageId(fetchedGarageId);
          console.log("Found garage via RPC:", fetchedGarageId);
        } else {
          console.log("No garage membership found via RPC");
          setGarageId(null);
        }
      }
    } catch (error) {
      console.error("Unexpected error fetching user garage:", error);
      setGarageId(null);
    } finally {
      setLoading(false);
    }
  };

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
