
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";

export const useTicketQueries = (formData: { client_id: string | null }) => {
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

  const { data: technicians } = useQuery({
    queryKey: ["technicians", garageId],
    queryFn: async () => {
      if (!garageId) {
        console.error("No garage ID available");
        return [];
      }

      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "technician")
        .eq("garage_id", garageId);

      if (rolesError) throw rolesError;

      if (!userRoles?.length) return [];

      const technicianIds = userRoles.map(role => role.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", technicianIds)
        .order("first_name");

      if (profilesError) throw profilesError;
      return profiles || [];
    },
    enabled: !!garageId,
  });

  const { data: clientVehicles } = useQuery({
    queryKey: ["vehicles", formData.client_id, garageId],
    enabled: !!formData.client_id && !!garageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("client_id", formData.client_id)
        .eq("garage_id", garageId);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: clientAppointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["available-appointments", formData.client_id, garageId],
    enabled: !!formData.client_id && !!garageId,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("appointments")
        .select("id, start_time, service_type")
        .eq("client_id", formData.client_id)
        .eq("garage_id", garageId)
        .gte("start_time", thirtyDaysAgo.toISOString())
        .order("start_time");

      if (error) throw error;
      return data || [];
    },
  });

  return {
    clients,
    technicians,
    clientVehicles,
    clientAppointments,
    isLoadingAppointments,
  };
};
