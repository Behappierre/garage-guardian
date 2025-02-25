
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentWithRelations, DBJobTicket } from "@/types/appointment";

export const useAppointments = () => {
  return useQuery({
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
};
