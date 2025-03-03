
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

// Define the Garage type
interface Garage {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  settings: any;
  created_at: string;
  updated_at: string;
}

// Define the GarageRole type
type GarageRole = "owner" | "admin" | "staff" | "technician" | "front_desk";

// Define the GarageContextType
interface GarageContextType {
  userGarages: Garage[];
  currentGarage: Garage | null;
  loading: boolean;
  userGarageRoles: Record<string, GarageRole>;
  setCurrentGarage: (garage: Garage) => void;
  fetchUserGarages: () => Promise<void>;
}

// Create the context
const GarageContext = createContext<GarageContextType>({
  userGarages: [],
  currentGarage: null,
  loading: true,
  userGarageRoles: {},
  setCurrentGarage: () => {},
  fetchUserGarages: async () => {},
});

// Define the GarageProvider component
export const GarageProvider = ({ children }: { children: React.ReactNode }) => {
  const [userGarages, setUserGarages] = useState<Garage[]>([]);
  const [currentGarage, setCurrentGarage] = useState<Garage | null>(null);
  const [loading, setLoading] = useState(true);
  const [userGarageRoles, setUserGarageRoles] = useState<Record<string, GarageRole>>({});
  const { user, loading: authLoading } = useAuth();

  // Function to fetch user garages
  const fetchUserGarages = async () => {
    try {
      if (!user) {
        setUserGarages([]);
        setCurrentGarage(null);
        return;
      }

      console.log("Fetching garages for user:", user.id);
      
      // Fetch garage memberships for the user
      const { data: memberships, error: membershipError } = await supabase
        .from('garage_members')
        .select('garage_id, role')
        .eq('user_id', user.id);

      if (membershipError) {
        console.error("Error fetching garage memberships:", membershipError);
        toast.error("Failed to load your garages");
        return;
      }

      if (!memberships || memberships.length === 0) {
        console.log("User has no garage memberships");
        setUserGarages([]);
        setCurrentGarage(null);
        setLoading(false);
        return;
      }

      // Convert memberships to roles map
      const rolesMap: Record<string, GarageRole> = {};
      memberships.forEach(m => {
        rolesMap[m.garage_id] = m.role as GarageRole;
      });
      setUserGarageRoles(rolesMap);

      // Fetch all garages that user is a member of
      const garageIds = memberships.map(m => m.garage_id);
      const { data: garages, error: garagesError } = await supabase
        .from('garages')
        .select('*')
        .in('id', garageIds);

      if (garagesError) {
        console.error("Error fetching garages:", garagesError);
        toast.error("Failed to load your garages");
        return;
      }

      if (garages) {
        console.log("Fetched garages:", garages.length);
        setUserGarages(garages);

        // Check if we need to set the current garage
        const currentGarageId = localStorage.getItem('currentGarageId');
        if (currentGarageId) {
          const garage = garages.find(g => g.id === currentGarageId);
          if (garage) {
            console.log("Setting current garage from localStorage:", garage.name);
            setCurrentGarage(garage);
          } else if (garages.length > 0) {
            // If saved garage not found, use the first one
            console.log("Saved garage not found, using first garage:", garages[0].name);
            setCurrentGarage(garages[0]);
            localStorage.setItem('currentGarageId', garages[0].id);
          }
        } else if (garages.length > 0) {
          // No current garage set, use the first one
          console.log("No current garage set, using first garage:", garages[0].name);
          setCurrentGarage(garages[0]);
          localStorage.setItem('currentGarageId', garages[0].id);
        }
      }
    } catch (error) {
      console.error("Error in fetchUserGarages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to load garages when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchUserGarages();
    }
  }, [user, authLoading]);

  // Provide context values
  return (
    <GarageContext.Provider
      value={{
        userGarages,
        currentGarage,
        loading,
        userGarageRoles,
        setCurrentGarage,
        fetchUserGarages,
      }}
    >
      {children}
    </GarageContext.Provider>
  );
};

// Hook to use the garage context
export const useGarage = () => {
  const context = useContext(GarageContext);
  if (context === undefined) {
    throw new Error("useGarage must be used within a GarageProvider");
  }
  return context;
};
