
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTechnicianData = (garageId: string | undefined) => {
  const { data: technicians } = useQuery({
    queryKey: ["technicians", garageId],
    queryFn: async () => {
      if (!garageId) return [];
      
      // Get user IDs with technician role
      const { data: technicianRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "technician")
        .eq("garage_id", garageId);
      
      if (rolesError) {
        console.error("Error fetching technician roles:", rolesError);
        return [];
      }
      
      if (!technicianRoles.length) return [];
      
      // Get technician profiles
      const { data: technicianProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", technicianRoles.map(role => role.user_id));
      
      if (profilesError) {
        console.error("Error fetching technician profiles:", profilesError);
        return [];
      }
      
      return technicianProfiles || [];
    },
    enabled: !!garageId,
  });

  return technicians || [];
};
