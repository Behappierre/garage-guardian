
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppointmentFormData } from "./types";

export const useAppointmentMutations = () => {
  const handleSubmit = async (
    formData: AppointmentFormData,
    selectedTickets: string[],
    appointmentId: string | undefined,
    queryClient: any,
    onClose: () => void
  ) => {
    try {
      const appointmentData = {
        client_id: formData.client_id,
        service_type: formData.service_type,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
        status: formData.status,
        vehicle_id: formData.vehicle_id
      };

      if (appointmentId) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", appointmentId);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from("appointment_job_tickets")
          .delete()
          .eq("appointment_id", appointmentId);

        if (deleteError) throw deleteError;

        if (selectedTickets.length > 0) {
          const { error: insertError } = await supabase
            .from("appointment_job_tickets")
            .insert(
              selectedTickets.map(ticketId => ({
                appointment_id: appointmentId,
                job_ticket_id: ticketId
              }))
            );

          if (insertError) throw insertError;
        }

        toast.success("Appointment updated successfully");
      } else {
        const { data: newAppointment, error: createError } = await supabase
          .from("appointments")
          .insert(appointmentData)
          .select()
          .single();

        if (createError) throw createError;

        if (selectedTickets.length > 0 && newAppointment) {
          const { error: ticketError } = await supabase
            .from("appointment_job_tickets")
            .insert(
              selectedTickets.map(ticketId => ({
                appointment_id: newAppointment.id,
                job_ticket_id: ticketId
              }))
            );

          if (ticketError) throw ticketError;
        }

        toast.success("Appointment created successfully");
      }

      // Invalidate ALL appointment queries and wait for them to refetch
      await queryClient.invalidateQueries({ 
        queryKey: ["client-appointments"],
        type: 'all',
        refetchType: 'all'
      });
      
      // Also invalidate the main appointments query
      await queryClient.invalidateQueries({ 
        queryKey: ["appointments"],
        type: 'all',
        refetchType: 'all'
      });
      
      // Wait a moment for the queries to refetch before closing
      await new Promise(resolve => setTimeout(resolve, 100));
      onClose();
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const handleCancel = async (
    appointmentId: string,
    queryClient: any,
    onClose: () => void
  ) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (error) throw error;

      // Invalidate ALL appointment queries and wait for them to refetch
      await queryClient.invalidateQueries({ 
        queryKey: ["client-appointments"],
        type: 'all',
        refetchType: 'all'
      });

      // Also invalidate the main appointments query
      await queryClient.invalidateQueries({ 
        queryKey: ["appointments"],
        type: 'all',
        refetchType: 'all'
      });

      toast.success("Appointment cancelled successfully");
      
      // Wait a moment for the queries to refetch before closing
      await new Promise(resolve => setTimeout(resolve, 100));
      onClose();
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  return { handleSubmit, handleCancel };
};
