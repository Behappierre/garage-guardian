
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { JobTicketFormData, JobTicketFormProps } from "@/types/job-ticket";
import { sendEmailNotification } from "@/services/notification-service";

export const useJobTicketForm = ({ clientId, vehicleId, onClose, initialData }: JobTicketFormProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<JobTicketFormData>({
    description: initialData?.description || "",
    status: (initialData?.status || "received"),
    priority: (initialData?.priority || "normal"),
    assigned_technician_id: initialData?.assigned_technician_id || null,
    client_id: initialData?.client_id || clientId || null,
    vehicle_id: initialData?.vehicle_id || vehicleId || null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const { data: linkedAppointment } = useQuery({
    queryKey: ["linked-appointment", initialData?.id],
    enabled: !!initialData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, start_time, service_type")
        .eq("job_ticket_id", initialData?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  useEffect(() => {
    if (linkedAppointment?.id) {
      setSelectedAppointmentId(linkedAppointment.id);
    }
  }, [linkedAppointment]);

  const onEnhanceDescription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('enhance-job-description', {
        body: { 
          description: formData.description,
          vehicle: clientVehicles?.find(v => v.id === formData.vehicle_id)
        }
      });

      if (error) throw error;
      if (!data?.enhancedDescription) throw new Error('No enhanced description returned');

      setFormData(prev => ({
        ...prev,
        description: data.enhancedDescription,
      }));
      
      toast.success('Description enhanced successfully');
    } catch (error: any) {
      toast.error('Failed to enhance description');
      console.error('Error enhancing description:', error);
    }
  };

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

  const { data: technicians } = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "technician");

      if (rolesError) throw rolesError;

      if (!userRoles?.length) return [];

      const technicianIds = userRoles.map(role => role.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", technicianIds)
        .order("first_name");

      if (profilesError) throw profilesError;
      return profiles;
    },
  });

  const { data: clientVehicles } = useQuery({
    queryKey: ["vehicles", formData.client_id],
    enabled: !!formData.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("client_id", formData.client_id);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: clientAppointments } = useQuery({
    queryKey: ["appointments", formData.client_id],
    enabled: !!formData.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, start_time, service_type")
        .eq("client_id", formData.client_id)
        .or(`job_ticket_id.is.null,job_ticket_id.eq.${initialData?.id}`)
        .gte("start_time", new Date().toISOString())
        .order("start_time");
      
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (initialData?.id) {
        // Update existing ticket
        const { error } = await supabase
          .from("job_tickets")
          .update(formData)
          .eq("id", initialData.id);

        if (error) throw error;

        // Clear any existing appointment linkage
        const { error: clearError } = await supabase
          .from("appointments")
          .update({ job_ticket_id: null })
          .eq("job_ticket_id", initialData.id);

        if (clearError) throw clearError;

        // Set new appointment linkage if selected
        if (selectedAppointmentId) {
          const { error: appointmentError } = await supabase
            .from("appointments")
            .update({ job_ticket_id: initialData.id })
            .eq("id", selectedAppointmentId);

          if (appointmentError) throw appointmentError;
        }

        if (formData.client_id && (formData.status === 'completed' || initialData.status !== formData.status)) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('first_name, last_name, email')
            .eq('id', formData.client_id)
            .single();

          if (clientData?.email) {
            const notificationType = formData.status === 'completed' ? 'completion' : 'status_update';
            await sendEmailNotification(
              initialData.id,
              notificationType,
              clientData.email,
              `${clientData.first_name} ${clientData.last_name}`,
              initialData.ticket_number,
              formData.status
            );
          }
        }

        toast.success("Job ticket updated successfully");
      } else {
        // Create new ticket
        const { data: ticket, error: ticketError } = await supabase
          .from("job_tickets")
          .insert({
            ...formData,
            ticket_number: 'TEMP'
          })
          .select()
          .single();

        if (ticketError) throw ticketError;

        // Link appointment to the new ticket if one was selected
        if (selectedAppointmentId && ticket) {
          const { error: appointmentError } = await supabase
            .from("appointments")
            .update({ job_ticket_id: ticket.id })
            .eq("id", selectedAppointmentId);

          if (appointmentError) throw appointmentError;
        }

        toast.success("Job ticket created successfully");
      }

      await queryClient.invalidateQueries({ queryKey: ["job_tickets"] });
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
    selectedAppointmentId,
    setSelectedAppointmentId,
    clients,
    clientVehicles,
    clientAppointments,
    technicians,
    handleSubmit,
    onEnhanceDescription,
  };
};
