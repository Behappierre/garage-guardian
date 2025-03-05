
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";

export const useAppointmentQueries = (clientId: string | null) => {
  const { garageId } = useAuth();

  const { data: clients } = useQuery({
    queryKey: ["clients", garageId],
    queryFn: async () => {
      if (!garageId) {
        console.error("No garage ID available for filtering clients");
        return [];
      }
      
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("garage_id", garageId)
        .order("first_name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!garageId,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles", clientId, garageId],
    queryFn: async () => {
      if (!clientId || !garageId) return [];
      
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, make, model, year, license_plate")
        .eq("client_id", clientId)
        .eq("garage_id", garageId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && !!garageId,
  });

  return {
    clients,
    vehicles
  };
};
