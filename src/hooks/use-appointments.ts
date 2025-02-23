
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
          client:clients(*)
        `)
        .order('start_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      const { data: ticketsData, error: ticketsError } = await supabase
        .from("appointment_job_tickets")
        .select(`
          appointment_id,
          job_ticket:job_tickets(
            *,
            vehicle:vehicles(*)
          )
        `);

      if (ticketsError) throw ticketsError;

      const ticketsByAppointment = ticketsData.reduce((acc: Record<string, DBJobTicket[]>, curr) => {
        if (curr.appointment_id && curr.job_ticket) {
          if (!acc[curr.appointment_id]) {
            acc[curr.appointment_id] = [];
          }
          acc[curr.appointment_id].push(curr.job_ticket);
        }
        return acc;
      }, {});

      return appointmentsData.map(appointment => ({
        ...appointment,
        job_tickets: ticketsByAppointment[appointment.id] || []
      })) as AppointmentWithRelations[];
    },
  });
};
