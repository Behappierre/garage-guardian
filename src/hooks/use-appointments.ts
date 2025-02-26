
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentWithRelations } from "@/types/appointment";

export const useAppointments = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*),
          job_tickets:job_tickets(*)
        `)
        .order('start_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      if (!appointmentsData) return [];

      // Transform the data to match the expected type and filter out appointments with missing client data
      const appointments = appointmentsData
        .filter(appointment => appointment.client) // Only include appointments with valid client data
        .map(appointment => ({
          ...appointment,
          job_tickets: appointment.job_tickets || []
        })) as AppointmentWithRelations[];

      return appointments;
    },
  });

  // Add this function to allow manual refreshing
  const refreshAppointments = () => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  };

  return {
    ...query,
    refreshAppointments,
  };
};
