
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentWithRelations } from "@/types/appointment";

export const useAppointments = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      // First, get all appointments with their basic relations
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `)
        .order('start_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      if (!appointmentsData) return [];

      // Get the appointment IDs to fetch related job tickets
      const appointmentIds = appointmentsData.map(appointment => appointment.id);
      
      // Fetch job tickets linked to these appointments through the junction table
      const { data: appointmentJobTickets, error: relationError } = await supabase
        .from("appointment_job_tickets")
        .select(`
          appointment_id,
          job_ticket:job_tickets(
            id, 
            ticket_number,
            status,
            description,
            vehicle:vehicles(*)
          )
        `)
        .in('appointment_id', appointmentIds);
      
      if (relationError) throw relationError;

      // Create a map of appointment IDs to their linked job tickets
      const jobTicketsMap = {} as Record<string, any[]>;
      
      appointmentJobTickets?.forEach(item => {
        if (item.appointment_id && item.job_ticket) {
          if (!jobTicketsMap[item.appointment_id]) {
            jobTicketsMap[item.appointment_id] = [];
          }
          jobTicketsMap[item.appointment_id].push(item.job_ticket);
        }
      });

      // Transform the data to match the expected type and filter out appointments with missing client data
      const appointments = appointmentsData
        .filter(appointment => appointment.client) // Only include appointments with valid client data
        .map(appointment => ({
          ...appointment,
          job_tickets: jobTicketsMap[appointment.id] || []
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
