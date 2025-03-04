
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TechnicianCost } from "./types";
import { useAuth } from "@/components/auth/AuthProvider";

export const useTechnicianCosts = () => {
  const { garageId } = useAuth();
  
  return useQuery({
    queryKey: ["technician-costs", garageId],
    queryFn: async () => {
      try {
        if (!garageId) {
          console.error("No garage ID available");
          return [];
        }
        
        // First get all technicians (users with technician role)
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "technician");

        if (roleError) throw roleError;
        
        if (!roleData || roleData.length === 0) {
          return [];
        }

        const technicianIds = roleData.map(r => r.user_id);

        // Get profile info for all technicians associated with this garage
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", technicianIds)
          .eq("garage_id", garageId);

        if (profilesError) throw profilesError;
        
        if (!profiles || profiles.length === 0) {
          return [];
        }

        // Filter to only get technicians for this garage
        const garageSpecificTechnicianIds = profiles.map(p => p.id);

        // Get existing hourly rates
        const { data: costs, error: costsError } = await supabase
          .from("technician_costs")
          .select("*")
          .in("technician_id", garageSpecificTechnicianIds)
          .eq("garage_id", garageId);

        if (costsError) throw costsError;

        // Merge the data
        const mergedData: TechnicianCost[] = profiles.map((profile: any) => {
          const cost = costs?.find((c: any) => c.technician_id === profile.id);
          return {
            id: cost?.id || "",
            technician_id: profile.id,
            hourly_rate: cost?.hourly_rate || 0,
            first_name: profile.first_name,
            last_name: profile.last_name,
          };
        });

        return mergedData;
      } catch (error) {
        console.error("Error fetching technician costs:", error);
        throw error;
      }
    },
    enabled: !!garageId, // Only run query when garageId is available
  });
};
