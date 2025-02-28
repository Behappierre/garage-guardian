
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TechnicianCost } from "./types";

export const useTechnicianCosts = () => {
  return useQuery({
    queryKey: ["technician-costs"],
    queryFn: async () => {
      try {
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

        // Get profile info for all technicians
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", technicianIds);

        if (profilesError) throw profilesError;

        // Get existing hourly rates
        const { data: costs, error: costsError } = await supabase
          .from("technician_costs")
          .select("*");

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
  });
};
