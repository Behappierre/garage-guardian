
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { JobTicketFormData } from "@/types/job-ticket";
import { sendEmailNotification } from "@/services/notification-service";

export const useTicketMutations = (onClose: () => void) => {
  const queryClient = useQueryClient();

  const submitTicket = async (
    formData: JobTicketFormData,
    initialTicketId: string | undefined,
    selectedAppointmentId: string | null
  ) => {
    try {
      let ticketId;
      
      if (initialTicketId) {
        const { error } = await supabase
          .from("job_tickets")
          .update({
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            assigned_technician_id: formData.assigned_technician_id,
            client_id: formData.client_id,
            vehicle_id: formData.vehicle_id
          })
          .eq("id", initialTicketId);

        if (error) throw error;
        ticketId = initialTicketId;
      } else {
        const { data: ticket, error: ticketError } = await supabase
          .from("job_tickets")
          .insert({
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            assigned_technician_id: formData.assigned_technician_id,
            client_id: formData.client_id,
            vehicle_id: formData.vehicle_id,
            ticket_number: 'TEMP'
          })
          .select()
          .single();

        if (ticketError) throw ticketError;
        ticketId = ticket.id;
      }

      if (selectedAppointmentId) {
        if (initialTicketId) {
          await supabase
            .from("appointment_job_tickets")
            .delete()
            .eq("job_ticket_id", ticketId);
        }

        const { error: relationError } = await supabase
          .from("appointment_job_tickets")
          .insert({
            appointment_id: selectedAppointmentId,
            job_ticket_id: ticketId
          });

        if (relationError) throw relationError;
      }

      if (formData.client_id && (formData.status === 'completed' || (initialTicketId && formData.status !== formData.status))) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('first_name, last_name, email')
          .eq('id', formData.client_id)
          .single();

        if (clientData?.email) {
          const notificationType = formData.status === 'completed' ? 'completion' : 'status_update';
          await sendEmailNotification(
            ticketId,
            notificationType,
            clientData.email,
            `${clientData.first_name} ${clientData.last_name}`,
            'New Ticket',
            formData.status
          );
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["job_tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(initialTicketId ? "Job ticket updated successfully" : "Job ticket created successfully");
      onClose();
      
      return ticketId;
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const enhanceDescription = async (description: string, vehicle: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('enhance-job-description', {
        body: { description, vehicle }
      });

      if (error) throw error;
      if (!data?.enhancedDescription) throw new Error('No enhanced description returned');

      toast.success('Description enhanced successfully');
      return data.enhancedDescription;
    } catch (error: any) {
      toast.error('Failed to enhance description');
      console.error('Error enhancing description:', error);
      throw error;
    }
  };

  return {
    submitTicket,
    enhanceDescription,
  };
};
