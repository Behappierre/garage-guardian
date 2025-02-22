
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppointmentWithRelations } from "@/pages/Appointments";

interface UseAppointmentFormProps {
  initialData?: AppointmentWithRelations | null;
  selectedDate?: Date | null;
  onClose: () => void;
}

export const useAppointmentForm = ({ initialData, selectedDate, onClose }: UseAppointmentFormProps) => {
  const queryClient = useQueryClient();
  const defaultDate = selectedDate || new Date();

  const formatDateTimeForInput = (dateString: string) => {
    return format(new Date(dateString), "yyyy-MM-dd'T'HH:mm");
  };

  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || "",
    service_type: initialData?.service_type || "",
    start_time: initialData?.start_time ? formatDateTimeForInput(initialData.start_time) : format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
    end_time: initialData?.end_time ? formatDateTimeForInput(initialData.end_time) : format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
    notes: initialData?.notes || "",
    status: initialData?.status || "scheduled" as const,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

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

  const { data: jobTickets } = useQuery({
    queryKey: ["job_tickets", formData.client_id],
    enabled: !!formData.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_tickets")
        .select(`
          id, 
          ticket_number, 
          description,
          vehicle:vehicles(*)
        `)
        .eq("client_id", formData.client_id)
        .not("status", "eq", "completed");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: appointmentTickets } = useQuery({
    queryKey: ["appointment-tickets", initialData?.id],
    enabled: !!initialData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_job_tickets")
        .select("job_ticket_id")
        .eq("appointment_id", initialData?.id);
      
      if (error) throw error;
      return data.map(t => t.job_ticket_id);
    },
  });

  useEffect(() => {
    if (appointmentTickets) {
      setSelectedTickets(appointmentTickets);
    }
  }, [appointmentTickets]);

  // Update vehicle ID when tickets are selected
  useEffect(() => {
    if (jobTickets && selectedTickets.length > 0) {
      const firstSelectedTicket = jobTickets.find(ticket => ticket.id === selectedTickets[0]);
      if (firstSelectedTicket?.vehicle) {
        setSelectedVehicleId(firstSelectedTicket.vehicle.id);
      }
    } else {
      setSelectedVehicleId(null);
    }
  }, [selectedTickets, jobTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData?.id) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            client_id: formData.client_id,
            service_type: formData.service_type,
            start_time: formData.start_time,
            end_time: formData.end_time,
            notes: formData.notes,
            status: formData.status,
          })
          .eq("id", initialData.id);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from("appointment_job_tickets")
          .delete()
          .eq("appointment_id", initialData.id);

        if (deleteError) throw deleteError;

        if (selectedTickets.length > 0) {
          const { error: insertError } = await supabase
            .from("appointment_job_tickets")
            .insert(
              selectedTickets.map(ticketId => ({
                appointment_id: initialData.id,
                job_ticket_id: ticketId
              }))
            );

          if (insertError) throw insertError;
        }

        toast.success("Appointment updated successfully");
      } else {
        const { data: newAppointment, error: createError } = await supabase
          .from("appointments")
          .insert({
            client_id: formData.client_id,
            service_type: formData.service_type,
            start_time: formData.start_time,
            end_time: formData.end_time,
            notes: formData.notes,
            status: formData.status,
          })
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

      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    isSubmitting,
    selectedTickets,
    setSelectedTickets,
    clients,
    jobTickets,
    selectedVehicleId,
    handleSubmit
  };
};
