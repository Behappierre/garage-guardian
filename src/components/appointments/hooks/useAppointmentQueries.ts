
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAppointmentQueries = (clientId: string, appointmentId?: string) => {
  // Get clients
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .order("first_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Get vehicles for selected client
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("client_id", clientId);
      
      if (error) throw error;
      return data;
    },
  });

  // Get job tickets for selected client
  const { data: jobTickets } = useQuery({
    queryKey: ["job_tickets", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_tickets")
        .select(`
          id, 
          ticket_number, 
          description,
          vehicle:vehicles(*)
        `)
        .eq("client_id", clientId)
        .not("status", "eq", "completed");
      
      if (error) throw error;
      return data;
    },
  });

  // Get appointment tickets with vehicle information
  const { data: appointmentTickets, isSuccess: appointmentTicketsLoaded } = useQuery({
    queryKey: ["appointment-tickets", appointmentId],
    enabled: !!appointmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_job_tickets")
        .select(`
          job_ticket_id,
          job_tickets (
            id,
            ticket_number,
            description,
            vehicle:vehicles(*)
          )
        `)
        .eq("appointment_id", appointmentId);
      
      if (error) throw error;
      return data;
    },
  });

  return {
    clients,
    vehicles,
    jobTickets,
    appointmentTickets,
    appointmentTicketsLoaded
  };
};
