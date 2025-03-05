
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { fetchUserGarage } from "@/utils/auth/fetchUserGarage";

export const useAuthState = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [garageId, setGarageId] = useState<string | null>(null);
  const [fetchingGarage, setFetchingGarage] = useState(false);

  const refreshGarageId = useCallback(async () => {
    if (user) {
      setFetchingGarage(true);
      const newGarageId = await fetchUserGarage(user.id, false);
      setGarageId(newGarageId);
      setFetchingGarage(false);
    }
  }, [user]);

  // Initial auth check and subscription setup
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setFetchingGarage(true);
            const foundGarageId = await fetchUserGarage(session.user.id, false);
            if (mounted) {
              setGarageId(foundGarageId);
              setFetchingGarage(false);
              setLoading(false);
            }
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
          (async () => {
            setFetchingGarage(true);
            const foundGarageId = await fetchUserGarage(session.user.id, false);
            if (mounted) {
              setGarageId(foundGarageId);
              setFetchingGarage(false);
              setLoading(false);
            }
          })();
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
  }, []);

  return {
    session,
    user,
    loading,
    garageId,
    refreshGarageId,
  };
};
