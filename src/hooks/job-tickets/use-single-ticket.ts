
import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JobTicket } from "@/types/job-ticket";
import { toast } from "sonner";

export const useSingleTicket = (
  ticketId: string | null,
  garageId: string | undefined
) => {
  const [selectedTicket, setSelectedTicket] = useState<JobTicket | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(!!ticketId);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(null);

  // Fetch specific ticket if ID is provided
  const { data: ticketData, isLoading: isLoadingTicketQuery } = useQuery({
    queryKey: ['job_ticket', ticketId, garageId],
    queryFn: async () => {
      if (!ticketId || !garageId) return null;
      
      const { data, error } = await supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*),
          technician:profiles(id, first_name, last_name)
        `)
        .eq('id', ticketId)
        .eq('garage_id', garageId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching ticket:", error);
        return null;
      }
      
      return data as JobTicket | null;
    },
    enabled: !!ticketId && !!garageId,
  });

  // Fetch linked appointment data when ticket ID is available
  const { data: linkedAppointment } = useQuery({
    queryKey: ['linked_appointment', ticketId, garageId],
    queryFn: async () => {
      if (!ticketId || !garageId) return null;
      
      const { data, error } = await supabase
        .from('appointment_job_tickets')
        .select('appointment_id')
        .eq('job_ticket_id', ticketId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching linked appointment:", error);
        return null;
      }
      
      return data?.appointment_id || null;
    },
    enabled: !!ticketId && !!garageId,
  });

  // Update linked appointment ID when data is loaded
  useEffect(() => {
    if (linkedAppointment) {
      setLinkedAppointmentId(linkedAppointment);
    }
  }, [linkedAppointment]);

  // Update selected ticket when ticket data is loaded
  useEffect(() => {
    if (ticketData) {
      setSelectedTicket(ticketData);
      setShowTicketForm(true);
    }
  }, [ticketData]);

  const fetchTicket = useCallback(async (id: string) => {
    try {
      if (!garageId) {
        toast.error("No garage selected");
        return;
      }
      
      setIsLoadingTicket(true);
      
      const { data, error } = await supabase
        .from('job_tickets')
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*),
          technician:profiles(id, first_name, last_name)
        `)
        .eq('id', id)
        .eq('garage_id', garageId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching ticket:", error);
        toast.error("Failed to load ticket details");
        return;
      }
      
      if (data) {
        setSelectedTicket(data as JobTicket);
        setShowTicketForm(true);
        
        // Fetch linked appointment
        const { data: appointmentLink, error: appointmentError } = await supabase
          .from('appointment_job_tickets')
          .select('appointment_id')
          .eq('job_ticket_id', id)
          .maybeSingle();
        
        if (appointmentError) {
          console.error("Error fetching linked appointment:", appointmentError);
        } else if (appointmentLink?.appointment_id) {
          setLinkedAppointmentId(appointmentLink.appointment_id);
        }
      } else {
        toast.error("Ticket not found or you don't have access to it");
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("An error occurred while loading the ticket");
    } finally {
      setIsLoadingTicket(false);
    }
  }, [garageId]);

  return {
    selectedTicket,
    setSelectedTicket,
    showTicketForm,
    setShowTicketForm,
    isLoadingTicket: isLoadingTicket || isLoadingTicketQuery,
    linkedAppointmentId,
    setLinkedAppointmentId,
    fetchTicket
  };
};
