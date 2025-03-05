
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppointmentWithRelations } from "@/types/appointment";
import { useAuth } from "@/components/auth/AuthProvider";

export const useAppointments = () => {
  const queryClient = useQueryClient();
  const { garageId } = useAuth();

  const query = useQuery({
    queryKey: ["appointments", garageId],
    queryFn: async () => {
      if (!garageId) {
        console.log("No garage ID available for appointments query");
        return [];
      }
      
      // First, get all appointments with their basic relations for the current garage
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*)
        `)
        .eq('garage_id', garageId)
        .order('start_time', { ascending: true });

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
        throw appointmentsError;
      }

      if (!appointmentsData) return [];

      // Get the appointment IDs to fetch related job tickets
      const appointmentIds = appointmentsData.map(appointment => appointment.id).filter(Boolean);
      
      if (appointmentIds.length === 0) {
        return [];
      }
      
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
      
      if (relationError) {
        console.error("Error fetching appointment job tickets:", relationError);
        throw relationError;
      }

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
        .filter(appointment => appointment && appointment.id) // Ensure appointment exists
        .map(appointment => ({
          ...appointment,
          job_tickets: jobTicketsMap[appointment.id] || []
        })) as AppointmentWithRelations[];

      return appointments;
    },
    enabled: !!garageId, // Only run the query if we have a garageId
  });

  // Add this function to allow manual refreshing
  const refreshAppointments = () => {
    if (garageId) {
      queryClient.invalidateQueries({ queryKey: ["appointments", garageId] });
    }
  };

  return {
    ...query,
    refreshAppointments,
  };
};
