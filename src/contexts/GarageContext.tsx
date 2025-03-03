
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Garage } from "@/types/garage";
import { toast } from "sonner";

type GarageContextType = {
  currentGarage: Garage | null;
  userGarages: Garage[];
  setCurrentGarage: (garage: Garage) => void;
  loading: boolean;
  error: string | null;
};

const GarageContext = createContext<GarageContextType>({
  currentGarage: null,
  userGarages: [],
  setCurrentGarage: () => {},
  loading: true,
  error: null,
});

export const useGarage = () => useContext(GarageContext);

type GarageProviderProps = {
  children: ReactNode;
};

export const GarageProvider = ({ children }: GarageProviderProps) => {
  const [currentGarage, setCurrentGarageState] = useState<Garage | null>(null);
  const [userGarages, setUserGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's garages and set the current garage
  useEffect(() => {
    const fetchGarages = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        // Get user's garages
        const { data: garageMembers, error: membersError } = await supabase
          .from("garage_members")
          .select("garage_id")
          .eq("user_id", user.id);
        
        if (membersError) {
          throw membersError;
        }
        
        if (!garageMembers || garageMembers.length === 0) {
          setUserGarages([]);
          setLoading(false);
          return;
        }
        
        const garageIds = garageMembers.map(member => member.garage_id);
        
        const { data: garages, error: garagesError } = await supabase
          .from("garages")
          .select("*")
          .in("id", garageIds);
        
        if (garagesError) {
          throw garagesError;
        }
        
        setUserGarages(garages || []);
        
        // Set current garage from localStorage if available
        const storedGarageId = localStorage.getItem("currentGarageId");
        
        if (storedGarageId && garages?.some(g => g.id === storedGarageId)) {
          const current = garages.find(g => g.id === storedGarageId) || null;
          setCurrentGarageState(current);
        } else if (garages && garages.length > 0) {
          // Default to first garage
          setCurrentGarageState(garages[0]);
          localStorage.setItem("currentGarageId", garages[0].id);
        }
      } catch (err: any) {
        console.error("Error fetching garages:", err);
        setError(err.message || "Failed to load garages");
        toast.error("Failed to load garage information");
      } finally {
        setLoading(false);
      }
    };
    
    fetchGarages();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchGarages();
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const setCurrentGarage = (garage: Garage) => {
    setCurrentGarageState(garage);
    localStorage.setItem("currentGarageId", garage.id);
    toast.success(`Switched to ${garage.name}`);
  };

  return (
    <GarageContext.Provider
      value={{
        currentGarage,
        userGarages,
        setCurrentGarage,
        loading,
        error,
      }}
    >
      {children}
    </GarageContext.Provider>
  );
};
