
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { JobTicketFormData, JobTicketFormProps } from "@/types/job-ticket";
import { useTicketQueries } from "./tickets/use-ticket-queries";
import { useTicketMutations } from "./tickets/use-ticket-mutations";

export const useJobTicketForm = ({ clientId, vehicleId, onClose, initialData, linkedAppointmentId }: JobTicketFormProps) => {
  const [formData, setFormData] = useState<JobTicketFormData>({
    description: initialData?.description || "",
    status: (initialData?.status || "received"),
    priority: (initialData?.priority || "normal"),
    assigned_technician_id: initialData?.assigned_technician_id || null,
    client_id: initialData?.client_id || clientId || null,
    vehicle_id: initialData?.vehicle_id || vehicleId || null,
    ticket_type: initialData?.ticket_type || "repair",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(linkedAppointmentId || null);

  const { data: linkedAppointment } = useQuery({
    queryKey: ["linked-appointment", initialData?.id],
    enabled: !!initialData?.id && !linkedAppointmentId, // Only run this query if we don't already have the linked appointment
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_job_tickets")
        .select(`
          appointment:appointments (
            id,
            start_time,
            service_type
          )
        `)
        .eq("job_ticket_id", initialData?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.appointment;
    },
  });

  useEffect(() => {
    if (linkedAppointmentId) {
      setSelectedAppointmentId(linkedAppointmentId);
    } else if (linkedAppointment?.id) {
      setSelectedAppointmentId(linkedAppointment.id);
    }
  }, [linkedAppointment, linkedAppointmentId]);

  const {
    clients,
    technicians,
    clientVehicles,
    clientAppointments,
    isLoadingAppointments,
  } = useTicketQueries(formData);

  const { submitTicket, enhanceDescription } = useTicketMutations(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("Submitting job ticket with formData:", formData);
      await submitTicket(formData, initialData?.id, selectedAppointmentId);
    } catch (error: any) {
      console.error("Error submitting ticket:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEnhanceDescription = async () => {
    try {
      const enhancedDesc = await enhanceDescription(
        formData.description,
        clientVehicles?.find(v => v.id === formData.vehicle_id)
      );
      setFormData(prev => ({
        ...prev,
        description: enhancedDesc,
      }));
    } catch (error) {
      // Error is handled in the mutation hook
      console.error("Error in enhance description:", error);
    }
  };

  return {
    formData,
    setFormData,
    isSubmitting,
    selectedAppointmentId,
    setSelectedAppointmentId,
    clients,
    clientVehicles,
    clientAppointments,
    isLoadingAppointments,
    technicians,
    handleSubmit,
    onEnhanceDescription,
  };
};
